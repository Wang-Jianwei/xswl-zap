#pragma once

#include <complex>

namespace vna {
namespace core {

class SParameterMath {
 public:
  static double MagnitudeDb(const std::complex<double>& value);
  static double PhaseDeg(const std::complex<double>& value);
};

}  // namespace core
}  // namespace vna
