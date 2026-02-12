#include <iostream>
#include <string>
#include <cstdlib>

#include <grpcpp/grpcpp.h>

#include "vna.grpc.pb.h"

int main(int argc, char** argv) {
  const std::string endpoint = (argc > 1) ? argv[1] : "127.0.0.1:50051";
  const int maxFrames = (argc > 2) ? std::atoi(argv[2]) : 3;
  if (maxFrames <= 0) {
    std::cout << "maxFrames must be > 0\n";
    return 1;
  }

  std::shared_ptr<grpc::Channel> channel =
      grpc::CreateChannel(endpoint, grpc::InsecureChannelCredentials());
  std::unique_ptr<vna::VnaControl::Stub> stub = vna::VnaControl::NewStub(channel);

  grpc::ClientContext context;
  vna::AcquisitionRequest request;
  request.set_instance_id("inst0");
  request.set_sample_count(16);
  request.set_timeout_ms(1000);
  request.mutable_excitation()->set_mode(vna::ExcitationMode::EXCITATION_MODE_CW);
  request.mutable_excitation()->mutable_cw()->set_frequency_hz(1.0e9);
  request.mutable_excitation()->mutable_cw()->set_power_dbm(-10.0);

  std::unique_ptr<grpc::ClientReader<vna::AcquisitionResult>> reader =
      stub->StreamAcquisition(&context, request);

  int frameCount = 0;
  vna::AcquisitionResult frame;
  while (reader->Read(&frame)) {
    ++frameCount;
    std::cout << "StreamAcquisition frame=" << frameCount
              << " instance=" << frame.instance_id()
              << " timestamp_ns=" << frame.timestamp_ns();
    if (frame.has_frequency_frame()) {
      std::cout << " points=" << frame.frequency_frame().points_size();
    }
    if (frame.has_time_frame()) {
      std::cout << " points=" << frame.time_frame().points_size();
    }
    std::cout << "\n";

    if (frameCount >= maxFrames) {
      context.TryCancel();
      break;
    }
  }

  const grpc::Status status = reader->Finish();
  if (status.ok()) {
    if (frameCount <= 0) {
      std::cout << "StreamAcquisition returned no frames\n";
      return 3;
    }
    std::cout << "grpc stream smoke success" << "\n";
    return 0;
  }

  if (status.error_code() != grpc::StatusCode::CANCELLED) {
    std::cout << "StreamAcquisition RPC failed: code=" << status.error_code()
              << " message=" << status.error_message() << "\n";
    return 2;
  }

  if (frameCount <= 0) {
    std::cout << "StreamAcquisition returned no frames\n";
    return 3;
  }

  std::cout << "grpc stream smoke success frames=" << frameCount << "\n";
  return 0;
}
