#include <cassert>
#include <fstream>

#include "service/service_config.h"

int main() {
  {
    vna::service::ServiceConfig cfg;
    std::vector<std::string> errors;

    vna::core::Status status = vna::service::ServiceConfigLoader::LoadFromFile(
        "config/service.yaml", cfg, errors);
    if (status != vna::core::Status::kOk) {
      errors.clear();
      status = vna::service::ServiceConfigLoader::LoadFromFile("../config/service.yaml", cfg, errors);
    }

    assert(status == vna::core::Status::kOk);
    assert(errors.empty());
    assert(cfg.bindAddress == "0.0.0.0");
    assert(cfg.port == 50051);
    assert(!cfg.tlsEnabled);
    assert(cfg.logLevel == "info");
    assert(cfg.streamThrottleEveryNFrames == 4);
    assert(cfg.streamThrottleMs == 10);
    assert(!cfg.deEmbeddingEnabled);
    assert(cfg.deEmbeddingPortTransfer == "1.0,1.0,1.0,1.0");
  }

  {
    const char* filePath = "build/bad_service.yaml";
    std::ofstream out(filePath);
    out << "port: abc\n";
    out << "tls_enabled: maybe\n";
    out << "stream_throttle_every_n_frames: 0\n";
    out << "stream_throttle_ms: xyz\n";
    out << "de_embedding_enabled: maybe\n";
    out.close();

    vna::service::ServiceConfig cfg;
    std::vector<std::string> errors;

    const vna::core::Status status = vna::service::ServiceConfigLoader::LoadFromFile(
        filePath, cfg, errors);

    assert(status == vna::core::Status::kInvalidArgument);
    assert(errors.size() >= 5);
  }

  return 0;
}
