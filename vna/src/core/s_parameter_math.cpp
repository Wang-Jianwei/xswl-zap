#include "core/s_parameter_math.h"

#include <cmath>
#include <limits>

namespace vna {
namespace core {

double SParameterMath::MagnitudeDb(const std::complex<double>& value) {
  const double magnitude = std::abs(value);
  const double safeMagnitude = magnitude < std::numeric_limits<double>::epsilon()
                                   ? std::numeric_limits<double>::epsilon()
                                   : magnitude;
  return 20.0 * std::log10(safeMagnitude);
}

double SParameterMath::PhaseDeg(const std::complex<double>& value) {
  const double rad = std::atan2(value.imag(), value.real());
  return rad * 180.0 / 3.14159265358979323846;
}

}  // namespace core
}  // namespace vna
