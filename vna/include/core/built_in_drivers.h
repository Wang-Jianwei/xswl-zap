#pragma once

namespace vna {
namespace core {

// Registers drivers that are compiled into the binary (currently mock drivers).
// Pre-GA policy: keep it simple; later we can split mock/real drivers behind build options.
void RegisterBuiltInDrivers();

}  // namespace core
}  // namespace vna
