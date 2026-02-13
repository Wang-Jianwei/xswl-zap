#pragma once

#include <string>
#include <vector>

namespace vna {
namespace service {

std::vector<std::string> BuildGrpcServerConfigCandidates(const std::string& executablePath);

}  // namespace service
}  // namespace vna
