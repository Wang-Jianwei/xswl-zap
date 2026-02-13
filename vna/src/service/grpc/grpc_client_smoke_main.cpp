#include <iostream>
#include <string>

#include <grpcpp/grpcpp.h>

#include "vna.grpc.pb.h"

int main(int argc, char** argv) {
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
    request.mutable_excitation()->mutable_cw()->set_power_dbm(-10.0);

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
    std::cout << "\n";
  }

  std::cout << "grpc smoke client success" << "\n";
  return 0;
}
