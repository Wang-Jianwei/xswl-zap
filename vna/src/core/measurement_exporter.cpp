#include "core/measurement_exporter.h"

#include <cerrno>
#include <cstddef>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <sys/stat.h>

#ifdef _WIN32
#include <direct.h>
#endif

#include "core/s_parameter_math.h"

namespace vna {
namespace core {

namespace {

std::string FormatDouble(double value) {
  std::ostringstream stream;
  stream << std::setprecision(16) << value;
  return stream.str();
}

std::string GetParentPath(const std::string& path) {
  const std::size_t pos = path.find_last_of("\\/");
  if (pos == std::string::npos) {
    return "";
  }
  return path.substr(0, pos);
}

bool IsDirectory(const std::string& path) {
  if (path.empty()) {
    return false;
  }

  struct stat info;
  if (stat(path.c_str(), &info) != 0) {
    return false;
  }

  return (info.st_mode & S_IFDIR) != 0;
}

bool CreateDirectorySingle(const std::string& path) {
#ifdef _WIN32
  const int rc = _mkdir(path.c_str());
#else
  const int rc = mkdir(path.c_str(), 0755);
#endif
  if (rc == 0 || errno == EEXIST) {
    return true;
  }
  return false;
}

bool EnsureDirectoryRecursive(const std::string& rawPath) {
  if (rawPath.empty()) {
    return true;
  }

  std::string path = rawPath;
  for (std::size_t i = 0; i < path.size(); ++i) {
    if (path[i] == '\\') {
      path[i] = '/';
    }
  }

  std::string current;
  std::size_t start = 0;
  if (path.size() > 1 && path[1] == ':') {
    current = path.substr(0, 2);
    start = 2;
  }
  if (!path.empty() && path[0] == '/') {
    current = "/";
    start = 1;
  }

  while (start < path.size()) {
    const std::size_t slashPos = path.find('/', start);
    const std::string part = path.substr(start, slashPos == std::string::npos ? std::string::npos : slashPos - start);
    if (!part.empty()) {
      if (!current.empty() && current[current.size() - 1] != '/' && current[current.size() - 1] != ':') {
        current += '/';
      }
      current += part;

      if (!IsDirectory(current) && !CreateDirectorySingle(current)) {
        return false;
      }
    }

    if (slashPos == std::string::npos) {
      break;
    }
    start = slashPos + 1;
  }

  return true;
}

std::complex<double> ReadMatrixPoint(const SParameterFrequencyPoint& point,
                                     std::size_t row,
                                     std::size_t col) {
  if (point.portCount == 0) {
    return std::complex<double>(0.0, 0.0);
  }

  const std::size_t n = static_cast<std::size_t>(point.portCount);
  const std::size_t index = row * n + col;
  if (index >= point.matrix.size()) {
    return std::complex<double>(0.0, 0.0);
  }

  return point.matrix[index];
}

}  // namespace

Status MeasurementExporter::ExportCsv(const AcquisitionResult& result,
                                      const std::string& outputPath,
                                      std::string* errorMessage) {
  if (outputPath.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = "csv export path is empty";
    }
    return Status::kInvalidArgument;
  }

  const std::string parentPath = GetParentPath(outputPath);
  if (!parentPath.empty() && !EnsureDirectoryRecursive(parentPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to create csv output directory: " + parentPath;
    }
    return Status::kInvalidArgument;
  }

  std::ofstream out(outputPath.c_str(), std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to open csv output path: " + outputPath;
    }
    return Status::kInvalidArgument;
  }

  out << "frequency_hz,data_product,channel,row_port,col_port,real,imag,magnitude_db,phase_deg,clipped,timestamp_ns\n";

  for (std::size_t i = 0; i < result.receiverRaw.points.size(); ++i) {
    const ReceiverFrequencyPoint& point = result.receiverRaw.points[i];
    for (std::size_t channelIndex = 0; channelIndex < point.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& channel = point.channels[channelIndex];
      out << FormatDouble(point.frequencyHz) << ",receiver_raw," << channel.channelId
          << ",0,0," << FormatDouble(channel.iq.real()) << "," << FormatDouble(channel.iq.imag())
          << "," << FormatDouble(SParameterMath::MagnitudeDb(channel.iq))
          << "," << FormatDouble(SParameterMath::PhaseDeg(channel.iq))
          << "," << (channel.clipped ? "true" : "false") << "," << point.timestampNs << "\n";
    }
  }

  for (std::size_t i = 0; i < result.receiverCompensated.points.size(); ++i) {
    const ReceiverFrequencyPoint& point = result.receiverCompensated.points[i];
    for (std::size_t channelIndex = 0; channelIndex < point.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& channel = point.channels[channelIndex];
      out << FormatDouble(point.frequencyHz) << ",receiver_compensated," << channel.channelId
          << ",0,0," << FormatDouble(channel.iq.real()) << "," << FormatDouble(channel.iq.imag())
          << "," << FormatDouble(SParameterMath::MagnitudeDb(channel.iq))
          << "," << FormatDouble(SParameterMath::PhaseDeg(channel.iq))
          << "," << (channel.clipped ? "true" : "false") << "," << point.timestampNs << "\n";
    }
  }

  for (std::size_t i = 0; i < result.sParameters.points.size(); ++i) {
    const SParameterFrequencyPoint& point = result.sParameters.points[i];
    const std::size_t portCount = static_cast<std::size_t>(point.portCount);
    for (std::size_t row = 0; row < portCount; ++row) {
      for (std::size_t col = 0; col < portCount; ++col) {
        const std::complex<double> value = ReadMatrixPoint(point, row, col);
        out << FormatDouble(point.frequencyHz) << ",s_parameter,," << (row + 1) << "," << (col + 1)
            << "," << FormatDouble(value.real()) << "," << FormatDouble(value.imag())
            << "," << FormatDouble(SParameterMath::MagnitudeDb(value))
            << "," << FormatDouble(SParameterMath::PhaseDeg(value))
            << ",false,0\n";
      }
    }
  }

  if (!out.good()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to write csv output path: " + outputPath;
    }
    return Status::kInternalError;
  }

  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return Status::kOk;
}

Status MeasurementExporter::ExportTouchstone(const AcquisitionResult& result,
                                             const std::string& outputPath,
                                             std::string* errorMessage) {
  if (outputPath.empty() || result.sParameters.points.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = outputPath.empty()
                          ? "touchstone export path is empty"
                          : "touchstone export requires non-empty s-parameter points";
    }
    return Status::kInvalidArgument;
  }

  const std::string parentPath = GetParentPath(outputPath);
  if (!parentPath.empty() && !EnsureDirectoryRecursive(parentPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to create touchstone output directory: " + parentPath;
    }
    return Status::kInvalidArgument;
  }

  const std::uint32_t portCount = result.sParameters.points.front().portCount;
  if (portCount == 0) {
    if (errorMessage != nullptr) {
      *errorMessage = "touchstone export requires non-zero port count";
    }
    return Status::kInvalidArgument;
  }

  std::ofstream out(outputPath.c_str(), std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to open touchstone output path: " + outputPath;
    }
    return Status::kInvalidArgument;
  }

  out << "! xswl-zap-vna Touchstone export\n";
  out << "# Hz S RI R 50\n";

  const std::size_t n = static_cast<std::size_t>(portCount);
  for (std::size_t pointIndex = 0; pointIndex < result.sParameters.points.size(); ++pointIndex) {
    const SParameterFrequencyPoint& point = result.sParameters.points[pointIndex];
    out << FormatDouble(point.frequencyHz);

    for (std::size_t col = 0; col < n; ++col) {
      for (std::size_t row = 0; row < n; ++row) {
        const std::complex<double> value = ReadMatrixPoint(point, row, col);
        out << " " << FormatDouble(value.real()) << " " << FormatDouble(value.imag());
      }
    }

    out << "\n";
  }

  if (!out.good()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to write touchstone output path: " + outputPath;
    }
    return Status::kInternalError;
  }

  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return Status::kOk;
}

}  // namespace core
}  // namespace vna
