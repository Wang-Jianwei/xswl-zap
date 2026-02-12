#pragma once

#include <string>
#include <vector>

namespace vna {
namespace core {

struct Topology {
  std::string id;
  std::string yaml;
};

struct ValidationResult {
  bool ok = true;
  std::vector<std::string> errors;
};

}  // namespace core
}  // namespace vna
