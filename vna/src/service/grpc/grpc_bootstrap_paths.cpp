#include "service/grpc/grpc_bootstrap_paths.h"

#include <algorithm>

namespace {

std::string NormalizePath(const std::string& path) {
  std::string normalized = path;
  std::replace(normalized.begin(), normalized.end(), '\\', '/');
  return normalized;
}

std::string DirName(const std::string& path) {
  const std::string normalized = NormalizePath(path);
  const std::string::size_type pos = normalized.find_last_of('/');
  if (pos == std::string::npos) {
    return std::string();
  }
  return normalized.substr(0, pos);
}

std::string JoinPath(const std::string& lhs, const std::string& rhs) {
  if (lhs.empty()) {
    return rhs;
  }

  if (lhs[lhs.size() - 1] == '/') {
    return lhs + rhs;
  }
  return lhs + "/" + rhs;
}

bool Contains(const std::vector<std::string>& values, const std::string& target) {
  return std::find(values.begin(), values.end(), target) != values.end();
}

}  // namespace

namespace vna {
namespace service {

std::vector<std::string> BuildGrpcServerConfigCandidates(const std::string& executablePath) {
  std::vector<std::string> candidates;
  candidates.push_back("config/service.yaml");

  const std::string executableDir = DirName(executablePath);
  if (!executableDir.empty()) {
    const std::string fromBuildDir = JoinPath(executableDir, "../config/service.yaml");
    if (!Contains(candidates, fromBuildDir)) {
      candidates.push_back(fromBuildDir);
    }

    const std::string siblingConfig = JoinPath(executableDir, "config/service.yaml");
    if (!Contains(candidates, siblingConfig)) {
      candidates.push_back(siblingConfig);
    }
  }

  return candidates;
}

}  // namespace service
}  // namespace vna
