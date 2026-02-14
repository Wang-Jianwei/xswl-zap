#include <iostream>
#include <fstream>
#include <string>
#include <filesystem>

#include <grpcpp/grpcpp.h>

#include "vna.grpc.pb.h"

int main(int argc, char** argv) {
  std::filesystem::path buildGrpcDir = std::filesystem::path("build-grpc");
  if (!std::filesystem::exists(buildGrpcDir)) {
    const std::filesystem::path parentCandidate = std::filesystem::path("..") / "build-grpc";
    if (std::filesystem::exists(parentCandidate)) {
      buildGrpcDir = parentCandidate;
    }
  }
  const std::string exportCsvPath = (buildGrpcDir / "grpc-acquire-export.csv").generic_string();
  const std::string exportTouchstonePath = (buildGrpcDir / "grpc-acquire-export.s4p").generic_string();
  const std::string exportJsonPath = (buildGrpcDir / "grpc-acquire-export.json").generic_string();

  const std::string endpoint = (argc > 1) ? argv[1] : "127.0.0.1:50051";

  std::shared_ptr<grpc::Channel> channel =
      grpc::CreateChannel(endpoint, grpc::InsecureChannelCredentials());
  std::unique_ptr<vna::VnaControl::Stub> stub = vna::VnaControl::NewStub(channel);

  {
    grpc::ClientContext context;
    vna::Empty request;
    vna::ServiceStatus response;

    const grpc::Status status = stub->GetServiceStatus(&context, request, &response);
    if (!status.ok()) {
      std::cout << "GetServiceStatus RPC failed: code=" << status.error_code()
                << " message=" << status.error_message() << "\n";
      return 2;
    }

    std::cout << "GetServiceStatus ok"
              << " ready=" << (response.ready() ? "true" : "false")
              << " state=" << response.state()
              << " bootstrap_mode=" << response.bootstrap_mode()
              << " config_path=" << response.config_path()
              << " bind=" << response.bind_address() << ":" << response.port()
              << " instances=" << response.instance_count()
              << " leases=" << response.active_lease_count() << "\n";

    if (response.bootstrap_mode().empty()) {
      std::cout << "GetServiceStatus validation failed: bootstrap_mode is empty\n";
      return 6;
    }

    if (response.config_path().empty()) {
      std::cout << "GetServiceStatus validation failed: config_path is empty\n";
      return 7;
    }
  }

  {
    grpc::ClientContext context;
    vna::Topology request;
    vna::ValidationResult response;

    request.set_id("smoke-topology");
    request.set_yaml("devices:\n  - id: devA\n    type: usb\n");

    const grpc::Status status = stub->ValidateTopology(&context, request, &response);
    if (!status.ok()) {
      std::cout << "ValidateTopology RPC failed: code=" << status.error_code()
                << " message=" << status.error_message() << "\n";
      return 3;
    }

    std::cout << "ValidateTopology ok=" << (response.ok() ? "true" : "false")
              << " errors=" << response.errors_size()
              << " details=" << response.error_details_size() << "\n";

    if (!response.ok()) {
      for (int i = 0; i < response.error_details_size(); ++i) {
        const vna::TopologyErrorDetail& detail = response.error_details(i);
        std::cout << "  [" << detail.code() << "] " << detail.field() << ": "
                  << detail.message() << "\n";
      }
      for (int i = 0; i < response.errors_size(); ++i) {
        std::cout << "  [plain] " << response.errors(i) << "\n";
      }
      return 4;
    }
  }

  {
    grpc::ClientContext context;
    vna::AcquisitionRequest request;
    vna::AcquisitionResult response;

    request.set_instance_id("inst0");
    request.set_sample_count(16);
    request.set_timeout_ms(1000);
    request.mutable_excitation()->set_mode(vna::ExcitationMode::EXCITATION_MODE_CW);
    request.mutable_excitation()->mutable_cw()->set_frequency_hz(1.0e9);
    request.mutable_excitation()->mutable_cw()->set_start_frequency_hz(1.0e9);
    request.mutable_excitation()->mutable_cw()->set_stop_frequency_hz(1.1e9);
    request.mutable_excitation()->mutable_cw()->set_sweep_point_count(3);
    request.mutable_excitation()->mutable_cw()->set_if_bandwidth_hz(1.0e3);
    request.mutable_excitation()->mutable_cw()->set_port_count(4);
    request.mutable_excitation()->mutable_cw()->set_excitation_port(2);
    request.mutable_excitation()->mutable_cw()->set_power_dbm(-10.0);
    request.set_export_csv_path(exportCsvPath);
    request.set_export_touchstone_path(exportTouchstonePath);
    request.set_export_json_path(exportJsonPath);

    const grpc::Status status = stub->Acquire(&context, request, &response);
    if (!status.ok()) {
      std::cout << "Acquire RPC failed: code=" << status.error_code()
                << " message=" << status.error_message() << "\n";
      return 5;
    }

    std::cout << "Acquire ok instance=" << response.instance_id()
              << " timestamp_ns=" << response.timestamp_ns();
    if (response.has_frequency_frame()) {
      std::cout << " points=" << response.frequency_frame().points_size();
    }
    if (response.has_time_frame()) {
      std::cout << " points=" << response.time_frame().points_size();
    }
    std::cout << " receiver_raw=" << response.receiver_raw_points_size()
              << " receiver_comp=" << response.receiver_compensated_points_size()
              << " s_param=" << response.s_parameter_points_size();
    std::cout << "\n";

    if (response.receiver_raw_points_size() == 0 ||
        response.receiver_compensated_points_size() == 0 ||
        response.s_parameter_points_size() == 0) {
      std::cout << "Acquire validation failed: receiver/s-parameter outputs are missing\n";
      return 8;
    }

    std::ifstream csvFile(exportCsvPath);
    std::ifstream sNpFile(exportTouchstonePath);
    std::ifstream jsonFile(exportJsonPath);
    if (!csvFile.good() || !sNpFile.good() || !jsonFile.good()) {
      std::cout << "Acquire validation failed: export files are missing\n";
      return 9;
    }
  }

  {
    grpc::ClientContext context;
    vna::ImportAcquisitionRequest request;
    vna::AcquisitionResult response;

    request.set_json_path(exportJsonPath);

    const grpc::Status status = stub->ImportAcquisition(&context, request, &response);
    if (!status.ok()) {
      std::cout << "ImportAcquisition RPC failed: code=" << status.error_code()
                << " message=" << status.error_message() << "\n";
      return 10;
    }

    if (response.instance_id().empty() || response.s_parameter_points_size() == 0) {
      std::cout << "ImportAcquisition validation failed: imported payload is incomplete\n";
      return 11;
    }
  }

  {
    grpc::ClientContext context;
    vna::ImportAcquisitionRequest request;
    vna::AcquisitionResult response;

    request.set_json_path("../outside/data.json");

    const grpc::Status status = stub->ImportAcquisition(&context, request, &response);
    if (status.ok()) {
      std::cout << "ImportAcquisition validation failed: traversal path unexpectedly accepted\n";
      return 12;
    }

    if (status.error_code() != grpc::StatusCode::INVALID_ARGUMENT ||
        status.error_message().find("IMPORT_PATH_TRAVERSAL") == std::string::npos) {
      std::cout << "ImportAcquisition validation failed: expected IMPORT_PATH_TRAVERSAL error\n";
      return 13;
    }
  }

  {
    grpc::ClientContext context;
    vna::CompareImportedAcquisitionRequest request;
    vna::CompareImportedAcquisitionResponse response;

    request.set_json_path(exportJsonPath);
    request.set_tolerance(2e-1);
    request.mutable_current_request()->set_instance_id("inst0");
    request.mutable_current_request()->set_sample_count(16);
    request.mutable_current_request()->set_timeout_ms(1000);
    request.mutable_current_request()->mutable_excitation()->set_mode(
        vna::ExcitationMode::EXCITATION_MODE_CW);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_frequency_hz(1.0e9);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_start_frequency_hz(1.0e9);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_stop_frequency_hz(1.1e9);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_sweep_point_count(3);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_if_bandwidth_hz(1.0e3);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_port_count(4);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_excitation_port(2);
    request.mutable_current_request()->mutable_excitation()->mutable_cw()->set_power_dbm(-10.0);

    const grpc::Status status = stub->CompareImportedAcquisition(&context, request, &response);
    if (!status.ok()) {
      std::cout << "CompareImportedAcquisition RPC failed: code=" << status.error_code()
                << " message=" << status.error_message() << "\n";
      return 14;
    }

    if (response.detail().empty()) {
      std::cout << "CompareImportedAcquisition validation failed: missing detail payload\n";
      return 15;
    }

    if (!response.matched()) {
      std::cout << "CompareImportedAcquisition warning: matched=false detail="
                << response.detail() << "\n";
    }
  }

  std::cout << "grpc smoke client success" << "\n";
  return 0;
}
