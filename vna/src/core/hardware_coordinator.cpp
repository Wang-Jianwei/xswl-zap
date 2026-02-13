#include "core/hardware_coordinator.h"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <complex>
#include <limits>
#include <string>
#include <vector>

namespace vna {
namespace core {

namespace {

Status MapDriverStatus(DriverStatus status) {
  switch (status) {
    case DriverStatus::kOk:
      return Status::kOk;
    case DriverStatus::kTimeout:
      return Status::kTimeout;
    case DriverStatus::kUnsupported:
      return Status::kUnsupported;
    case DriverStatus::kInvalidArgument:
      return Status::kInvalidArgument;
    case DriverStatus::kInternalError:
    default:
      return Status::kInternalError;
  }
}

std::uint64_t NowNs() {
  const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
  const std::chrono::nanoseconds ns =
      std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch());
  return static_cast<std::uint64_t>(ns.count());
}

std::vector<double> BuildSweepFrequencies(const ExcitationConfig& excitation) {
  std::vector<double> frequencies;

  const std::uint32_t requestedPoints = excitation.cw.sweepPointCount;
  const bool hasSweepRange = excitation.cw.startFrequencyHz > 0.0 &&
                             excitation.cw.stopFrequencyHz > 0.0 &&
                             excitation.cw.stopFrequencyHz >= excitation.cw.startFrequencyHz;

  if (requestedPoints >= 2 && hasSweepRange) {
    frequencies.reserve(requestedPoints);
    const double delta = (excitation.cw.stopFrequencyHz - excitation.cw.startFrequencyHz) /
                         static_cast<double>(requestedPoints - 1);
    for (std::uint32_t index = 0; index < requestedPoints; ++index) {
      frequencies.push_back(excitation.cw.startFrequencyHz + delta * static_cast<double>(index));
    }
    return frequencies;
  }

  const double fallbackFrequency = excitation.cw.frequencyHz > 0.0
                                       ? excitation.cw.frequencyHz
                                       : (hasSweepRange ? excitation.cw.startFrequencyHz : 1.0e9);
  frequencies.push_back(fallbackFrequency);
  return frequencies;
}

std::complex<double> ApplyFactoryCompensation(const std::complex<double>& inputIq) {
  const std::complex<double> gainPhase(1.002, -0.001);
  return inputIq * gainPhase;
}

double ClampFloor(double value, double floorValue) {
  return value < floorValue ? floorValue : value;
}

}  // namespace

HardwareCoordinator::HardwareCoordinator() : initialized_(false) {}

Status HardwareCoordinator::SetDriver(std::unique_ptr<HardwareDriver> driver) {
  if (!driver) {
    return Status::kInvalidArgument;
  }
  driver_ = std::move(driver);
  initialized_ = false;
  return Status::kOk;
}

HardwareDriver* HardwareCoordinator::GetDriver() const {
  return driver_.get();
}

Status HardwareCoordinator::Initialize() {
  if (!driver_) {
    return Status::kInvalidArgument;
  }
  const Status status = MapDriverStatus(driver_->Initialize());
  initialized_ = (status == Status::kOk);
  return status;
}

Status HardwareCoordinator::Shutdown() {
  if (!driver_) {
    return Status::kOk;
  }
  initialized_ = false;
  return MapDriverStatus(driver_->Shutdown());
}

Status HardwareCoordinator::Acquire(const std::string& instanceId,
                                    const ExcitationConfig& excitation,
                                    std::uint32_t sampleCount,
                                    std::uint32_t timeoutMs,
                                    AcquisitionResult& out) {
  if (!initialized_ || !driver_ || instanceId.empty() || sampleCount == 0) {
    return Status::kInvalidArgument;
  }

  if (excitation.mode == ExcitationMode::kContinuousWave) {
    return AcquireCw(instanceId, excitation, sampleCount, timeoutMs, out);
  }
  if (excitation.mode == ExcitationMode::kPulse) {
    return AcquirePulse(instanceId, excitation, sampleCount, timeoutMs, out);
  }

  return Status::kUnsupported;
}

Status HardwareCoordinator::AcquireCw(const std::string& instanceId,
                                      const ExcitationConfig& excitation,
                                      std::uint32_t sampleCount,
                                      std::uint32_t timeoutMs,
                                      AcquisitionResult& out) {
  (void)timeoutMs;

  const Status powerStatus = MapDriverStatus(driver_->SetPower(excitation.cw.powerDbm));
  if (powerStatus != Status::kOk) {
    return powerStatus;
  }

  const std::vector<double> frequencies = BuildSweepFrequencies(excitation);
  const std::uint32_t portCount = std::max<std::uint32_t>(1, excitation.cw.portCount);
  std::uint32_t excitationPort = excitation.cw.excitationPort;
  if (excitationPort == 0 || excitationPort > portCount) {
    excitationPort = 1;
  }
  const std::size_t excitationColumn = static_cast<std::size_t>(excitationPort - 1);

  out = AcquisitionResult();
  out.instanceId = instanceId;
  out.timestampNs = NowNs();
  out.dataType = AcquisitionDataType::kFrequencyDomain;
  out.frequencyDomain.frequenciesHz.reserve(frequencies.size());
  out.frequencyDomain.samples.reserve(frequencies.size());
  out.receiverRaw.points.reserve(frequencies.size());
  out.receiverCompensated.points.reserve(frequencies.size());
  out.sParameters.points.reserve(frequencies.size());

  for (std::size_t freqIndex = 0; freqIndex < frequencies.size(); ++freqIndex) {
    const double frequencyHz = frequencies[freqIndex];
    Status status = MapDriverStatus(driver_->SetFrequency(frequencyHz));
    if (status != Status::kOk) {
      return status;
    }

    std::vector<std::complex<double>> iq;
    status = MapDriverStatus(driver_->AcquireIq(iq, sampleCount));
    if (status != Status::kOk) {
      return status;
    }

    std::complex<double> sum(0.0, 0.0);
    for (std::size_t index = 0; index < iq.size(); ++index) {
      sum += iq[index];
    }
    const std::complex<double> mean = iq.empty()
                                          ? std::complex<double>(0.0, 0.0)
                                          : (sum / static_cast<double>(iq.size()));

    const std::complex<double> referenceRaw(
        ClampFloor(std::pow(10.0, excitation.cw.powerDbm / 20.0), 1e-6), 0.0);
    const std::complex<double> referenceCompensated = ApplyFactoryCompensation(referenceRaw);

    ReceiverFrequencyPoint rawPoint;
    rawPoint.frequencyHz = frequencyHz;
    rawPoint.timestampNs = NowNs();
    rawPoint.channels.reserve(static_cast<std::size_t>(portCount) + 1);

    ReceiverChannelSample rawReference;
    rawReference.channelId = std::string("R") + std::to_string(excitationPort);
    rawReference.iq = referenceRaw;
    rawReference.clipped = false;
    rawPoint.channels.push_back(rawReference);

    ReceiverFrequencyPoint compensatedPoint;
    compensatedPoint.frequencyHz = frequencyHz;
    compensatedPoint.timestampNs = rawPoint.timestampNs;
    compensatedPoint.channels.reserve(static_cast<std::size_t>(portCount) + 1);

    ReceiverChannelSample compensatedReference;
    compensatedReference.channelId = rawReference.channelId;
    compensatedReference.iq = referenceCompensated;
    compensatedReference.clipped = false;
    compensatedPoint.channels.push_back(compensatedReference);

    SParameterFrequencyPoint sPoint;
    sPoint.frequencyHz = frequencyHz;
    sPoint.portCount = portCount;
    sPoint.matrix.assign(static_cast<std::size_t>(portCount) * static_cast<std::size_t>(portCount),
                         std::complex<double>(0.0, 0.0));

    for (std::uint32_t portIndex = 0; portIndex < portCount; ++portIndex) {
      const double couplingScale = (portIndex + 1 == excitationPort) ? 0.12 : 0.85;
      const std::complex<double> measuredRaw = mean * couplingScale;
      const std::complex<double> measuredCompensated = ApplyFactoryCompensation(measuredRaw);
      const bool clipped = std::abs(measuredRaw) > 1.0;

      ReceiverChannelSample rawChannel;
      rawChannel.channelId = std::string("B") + std::to_string(portIndex + 1);
      rawChannel.iq = measuredRaw;
      rawChannel.clipped = clipped;
      rawPoint.channels.push_back(rawChannel);

      ReceiverChannelSample compensatedChannel;
      compensatedChannel.channelId = rawChannel.channelId;
      compensatedChannel.iq = measuredCompensated;
      compensatedChannel.clipped = clipped;
      compensatedPoint.channels.push_back(compensatedChannel);

      const std::complex<double> denominator = compensatedReference.iq;
      const double absDenominator = std::abs(denominator);
      const std::complex<double> safeDenominator =
          absDenominator < std::numeric_limits<double>::epsilon()
              ? std::complex<double>(std::numeric_limits<double>::epsilon(), 0.0)
              : denominator;

      const std::size_t rowIndex = static_cast<std::size_t>(portIndex);
      const std::size_t matrixIndex = rowIndex * static_cast<std::size_t>(portCount) + excitationColumn;
      sPoint.matrix[matrixIndex] = measuredCompensated / safeDenominator;
    }

    out.frequencyDomain.frequenciesHz.push_back(frequencyHz);
    out.frequencyDomain.samples.push_back(mean);
    out.receiverRaw.points.push_back(rawPoint);
    out.receiverCompensated.points.push_back(compensatedPoint);
    out.sParameters.points.push_back(sPoint);
  }

  return Status::kOk;
}

Status HardwareCoordinator::AcquirePulse(const std::string& instanceId,
                                         const ExcitationConfig& excitation,
                                         std::uint32_t sampleCount,
                                         std::uint32_t timeoutMs,
                                         AcquisitionResult& out) {
  (void)timeoutMs;

  const HardwareCapabilities caps = driver_->GetCapabilities();
  if (!caps.supportsPulseExcitation) {
    return Status::kUnsupported;
  }

  PulseConfig config;
  config.centerFrequencyHz = excitation.pulse.centerFrequencyHz;
  config.powerDbm = excitation.pulse.powerDbm;
  config.pulseWidthNs = excitation.pulse.pulseWidthNs;
  config.pulsePeriodNs = excitation.pulse.pulsePeriodNs;
  config.riseTimeNs = excitation.pulse.riseTimeNs;

  Status status = MapDriverStatus(driver_->SetPulseMode(config));
  if (status != Status::kOk) {
    return status;
  }

  std::vector<std::complex<double>> iq;
  status = MapDriverStatus(driver_->AcquireIq(iq, sampleCount));
  if (status != Status::kOk) {
    return status;
  }

  out = AcquisitionResult();
  out.instanceId = instanceId;
  out.timestampNs = NowNs();
  out.dataType = AcquisitionDataType::kTimeDomain;

  out.timeDomain.timePointsNs.clear();
  out.timeDomain.magnitude.clear();
  out.timeDomain.phase.clear();
  out.timeDomain.timePointsNs.reserve(iq.size());
  out.timeDomain.magnitude.reserve(iq.size());
  out.timeDomain.phase.reserve(iq.size());
  out.timeDomain.sampleRateGhz = caps.maxSamplingRateGhz;

  for (std::size_t index = 0; index < iq.size(); ++index) {
    out.timeDomain.timePointsNs.push_back(static_cast<double>(index));
    out.timeDomain.magnitude.push_back(std::abs(iq[index]));
    out.timeDomain.phase.push_back(std::arg(iq[index]));
  }

  return Status::kOk;
}

}  // namespace core
}  // namespace vna
