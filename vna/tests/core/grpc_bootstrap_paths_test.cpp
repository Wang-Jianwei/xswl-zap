#include <algorithm>
#include <cassert>
#include <string>
#include <vector>

#include "service/grpc/grpc_bootstrap_paths.h"

namespace {

bool Contains(const std::vector<std::string>& values, const std::string& target) {
  return std::find(values.begin(), values.end(), target) != values.end();
}

}  // namespace

int main() {
  {
    const std::vector<std::string> candidates =
        vna::service::BuildGrpcServerConfigCandidates("");
    assert(candidates.size() >= 1);
    assert(candidates[0] == "config/service.yaml");
  }

  {
    const std::vector<std::string> candidates =
        vna::service::BuildGrpcServerConfigCandidates("D:/workdir/open_source/xswl-zap/vna/build-grpc/easy_grpc_server.exe");
    assert(Contains(candidates, "config/service.yaml"));
    assert(Contains(candidates, "D:/workdir/open_source/xswl-zap/vna/build-grpc/../config/service.yaml"));
  }

  {
    const std::vector<std::string> candidates =
        vna::service::BuildGrpcServerConfigCandidates("D:\\workdir\\open_source\\xswl-zap\\vna\\build-grpc\\easy_grpc_server.exe");
    assert(Contains(candidates, "D:/workdir/open_source/xswl-zap/vna/build-grpc/../config/service.yaml"));
  }

  return 0;
}
