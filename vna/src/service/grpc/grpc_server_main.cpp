#include <iostream>
#include <memory>
#include <cctype>
#include <complex>
#include <sstream>
#include <string>
#include <vector>

#include <grpcpp/grpcpp.h>

#include "core/built_in_drivers.h"
#include "service/process_manager.h"
#include "service/service_config.h"
#include "service/service_status_service.h"
#include "service/grpc/grpc_bootstrap_paths.h"
#include "service/vna_control_inproc_handler.h"
#include "service/vna_control_service.h"
#include "service/grpc/vna_control_grpc_service.h"

namespace {

std::string TrimText(const std::string& text) {
  std::size_t begin = 0;
  while (begin < text.size() && std::isspace(static_cast<unsigned char>(text[begin])) != 0) {
    ++begin;
  }

  std::size_t end = text.size();
  while (end > begin && std::isspace(static_cast<unsigned char>(text[end - 1])) != 0) {
    --end;
  }

  return text.substr(begin, end - begin);
}

bool ParsePortTransferList(const std::string& text,
                           std::vector<std::complex<double> >& out,
                           std::string& error) {
  out.clear();
  error.clear();
  if (text.empty()) {
    error = "de_embedding_port_transfer is empty";
    return false;
  }

  std::stringstream ss(text);
  std::string token;
  while (std::getline(ss, token, ',')) {
    const std::string trimmed = TrimText(token);
    if (trimmed.empty()) {
      error = "de_embedding_port_transfer contains empty item";
      return false;
    }

    std::stringstream parser(trimmed);
    double value = 0.0;
    parser >> value;
    if (parser.fail() || !parser.eof()) {
      error = "de_embedding_port_transfer must be comma-separated doubles";
      return false;
    }
    out.push_back(std::complex<double>(value, 0.0));
  }

  if (out.empty()) {
    error = "de_embedding_port_transfer produced no values";
    return false;
  }
  return true;
}

bool ParseFrequencyPortTransferProfiles(
    const std::string& text,
    std::vector<vna::core::processors::FrequencyPortTransferProfile>& out,
    std::string& error) {
  out.clear();
  error.clear();
  if (text.empty()) {
    error = "de_embedding_frequency_profiles is empty";
    return false;
  }

  std::stringstream profileStream(text);
  std::string profileToken;
  while (std::getline(profileStream, profileToken, ';')) {
    const std::string trimmedProfile = TrimText(profileToken);
    if (trimmedProfile.empty()) {
      continue;
    }

    const std::size_t colonPos = trimmedProfile.find(':');
    if (colonPos == std::string::npos) {
      error = "profile must use '<frequency>:<transfer-list>' format";
      return false;
    }

    const std::string freqText = TrimText(trimmedProfile.substr(0, colonPos));
    const std::string transferText = TrimText(trimmedProfile.substr(colonPos + 1));

    std::stringstream freqParser(freqText);
    double frequencyHz = 0.0;
    freqParser >> frequencyHz;
    if (freqParser.fail() || !freqParser.eof() || frequencyHz <= 0.0) {
      error = "profile frequency must be positive double";
      return false;
    }

    std::vector<std::complex<double> > transfer;
    std::string transferError;
    if (!ParsePortTransferList(transferText, transfer, transferError)) {
      error = transferError;
      return false;
    }

    vna::core::processors::FrequencyPortTransferProfile profile;
    profile.frequencyHz = frequencyHz;
    profile.portTransfer = transfer;
    out.push_back(profile);
  }

  if (out.empty()) {
    error = "de_embedding_frequency_profiles produced no valid profiles";
    return false;
  }

  return true;
}

}  // namespace

int main(int argc, char** argv) {
  vna::core::RegisterBuiltInDrivers();

  vna::service::ServiceConfig config;
  std::string selectedConfigPath;
  std::vector<std::string> loadDiagnostics;
  const std::string executablePath = (argc > 0 && argv != nullptr) ? argv[0] : "";
  const std::vector<std::string> configCandidates =
      vna::service::BuildGrpcServerConfigCandidates(executablePath);

  for (std::size_t i = 0; i < configCandidates.size(); ++i) {
    std::vector<std::string> configErrors;
    const vna::core::Status configStatus =
        vna::service::ServiceConfigLoader::LoadFromFile(configCandidates[i], config, configErrors);
    if (configStatus == vna::core::Status::kOk) {
      selectedConfigPath = configCandidates[i];
      break;
    }

    std::string message = configCandidates[i] + " => ";
    if (configErrors.empty()) {
      message += "unknown error";
    } else {
      for (std::size_t j = 0; j < configErrors.size(); ++j) {
        if (j > 0) {
          message += " | ";
        }
        message += configErrors[j];
      }
    }
    loadDiagnostics.push_back(message);
  }

  if (selectedConfigPath.empty()) {
    std::cout << "grpc server config load failed\n";
    for (std::size_t i = 0; i < loadDiagnostics.size(); ++i) {
      std::cout << "  - " << loadDiagnostics[i] << "\n";
    }
    return 1;
  }

  std::cout << "grpc server config loaded: " << selectedConfigPath << "\n";

  if (config.tlsEnabled) {
    std::cout << "grpc server tls_enabled=true is not supported in minimal bootstrap mode\n";
    return 1;
  }

  vna::service::ProcessManager processManager;
  vna::service::ServiceStatusService statusService;
  vna::service::VnaControlService controlService;
  vna::service::VnaControlInProcessHandler inprocHandler;

  if (config.deEmbeddingEnabled) {
    if (!config.deEmbeddingFrequencyProfiles.empty()) {
      std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
      std::string parseError;
      if (!ParseFrequencyPortTransferProfiles(config.deEmbeddingFrequencyProfiles, profiles, parseError)) {
        std::cout << "grpc de-embedding frequency config invalid: " << parseError << "\n";
        return 1;
      }

      if (controlService.SetDeEmbeddingFrequencyPortTransferProfiles(profiles) != vna::core::Status::kOk) {
        std::cout << "grpc de-embedding frequency config rejected\n";
        return 1;
      }
      std::cout << "grpc de-embedding frequency profiles enabled: profile_count=" << profiles.size() << "\n";
    } else {
      std::vector<std::complex<double> > portTransfer;
      std::string parseError;
      if (!ParsePortTransferList(config.deEmbeddingPortTransfer, portTransfer, parseError)) {
        std::cout << "grpc de-embedding config invalid: " << parseError << "\n";
        return 1;
      }

      if (controlService.SetDeEmbeddingPortTransfer(portTransfer) != vna::core::Status::kOk) {
        std::cout << "grpc de-embedding config rejected: invalid port transfer values\n";
        return 1;
      }
      std::cout << "grpc de-embedding enabled: port_count=" << portTransfer.size() << "\n";
    }

    controlService.SetDeEmbeddingEnabled(true);
  }

  vna::core::Topology topology;
  topology.id = "grpc-topology";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n";

  if (controlService.ApplyTopology(topology, "ws-grpc", 2) != vna::core::Status::kOk) {
    processManager.SetDegraded("grpc bootstrap topology failed");
    std::cout << "grpc server topology bootstrap failed\n";
    return 1;
  }

  if (controlService.Start() != vna::core::Status::kOk) {
    processManager.SetDegraded("grpc bootstrap start failed");
    std::cout << "grpc server runtime start failed\n";
    return 1;
  }

  processManager.SetReady("grpc bootstrap");
  statusService.UpdateConfig(config);
  statusService.UpdateBootstrapContext("grpc", selectedConfigPath);
  statusService.UpdateHealth(processManager.GetHealth());
  statusService.UpdateRuntimeMetrics(controlService.InstanceCount(), controlService.ActiveLeaseCount());

  vna::service::VnaControlGrpcService grpcService(
      &controlService,
      &statusService,
      &inprocHandler,
      config.streamThrottleEveryNFrames,
      config.streamThrottleMs);

  std::vector<std::string> addresses;
  addresses.push_back(config.bindAddress + ":" + std::to_string(config.port));
  if (config.bindAddress == "0.0.0.0") {
    addresses.push_back("127.0.0.1:" + std::to_string(config.port));
  }

  for (std::size_t i = 0; i < addresses.size(); ++i) {
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addresses[i], grpc::InsecureServerCredentials());
    builder.RegisterService(&grpcService);

    std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
    if (!server) {
      std::cout << "grpc server start failed: " << addresses[i] << "\n";
      continue;
    }

    std::cout << "grpc server listening: " << addresses[i] << "\n";
    server->Wait();
    return 0;
  }

  std::cout << "grpc server failed to start on all candidate addresses\n";
  return 1;
}
