#include <cassert>
#include <cmath>

#include "core/s_parameter_math.h"

int main() {
  const std::complex<double> unit(1.0, 0.0);
  assert(std::abs(vna::core::SParameterMath::MagnitudeDb(unit)) < 1e-9);
  assert(std::abs(vna::core::SParameterMath::PhaseDeg(unit)) < 1e-9);

  const std::complex<double> q1(1.0, 1.0);
  const double phase = vna::core::SParameterMath::PhaseDeg(q1);
  assert(std::abs(phase - 45.0) < 1e-6);

  const std::complex<double> tiny(0.0, 0.0);
  const double tinyDb = vna::core::SParameterMath::MagnitudeDb(tiny);
  assert(std::isfinite(tinyDb));

  return 0;
}
