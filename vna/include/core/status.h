#pragma once

namespace vna {
namespace core {

enum class Status {
  kOk = 0,
  kInvalidArgument = 1,
  kTimeout = 2,
  kUnsupported = 3,
  kInternalError = 4,
  kCanceled = 5,
};

}  // namespace core
}  // namespace vna
