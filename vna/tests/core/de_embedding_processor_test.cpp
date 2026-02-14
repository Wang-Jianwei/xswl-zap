#include <cassert>
#include <complex>
#include <vector>

#include "core/processors/de_embedding_processor.h"

int main() {
  vna::core::processors::DeEmbeddingProcessor processor;

  vna::core::SParameterData sParameters;
  vna::core::SParameterFrequencyPoint point;
  point.frequencyHz = 1.0e9;
  point.portCount = 2;

  const std::complex<double> h1(0.5, 0.0);
  const std::complex<double> h2(2.0, 0.0);

  const std::complex<double> s11Ideal(0.2, 0.1);
  const std::complex<double> s12Ideal(0.05, -0.02);
  const std::complex<double> s21Ideal(0.8, 0.03);
  const std::complex<double> s22Ideal(-0.1, 0.15);

  point.matrix.push_back(s11Ideal * h1 * h1);
  point.matrix.push_back(s12Ideal * h1 * h2);
  point.matrix.push_back(s21Ideal * h2 * h1);
  point.matrix.push_back(s22Ideal * h2 * h2);
  sParameters.points.push_back(point);

  std::vector<std::complex<double> > transfer;
  transfer.push_back(h1);
  transfer.push_back(h2);

  assert(processor.ApplyDiagonalFixtureCompensation(sParameters, transfer) == vna::core::Status::kOk);
  assert(std::abs(sParameters.points[0].matrix[0] - s11Ideal) < 1e-12);
  assert(std::abs(sParameters.points[0].matrix[1] - s12Ideal) < 1e-12);
  assert(std::abs(sParameters.points[0].matrix[2] - s21Ideal) < 1e-12);
  assert(std::abs(sParameters.points[0].matrix[3] - s22Ideal) < 1e-12);

  std::vector<std::complex<double> > invalidTransfer;
  invalidTransfer.push_back(h1);
  assert(processor.ApplyDiagonalFixtureCompensation(sParameters, invalidTransfer) ==
         vna::core::Status::kInvalidArgument);

  std::vector<std::complex<double> > zeroTransfer;
  zeroTransfer.push_back(std::complex<double>(0.0, 0.0));
  zeroTransfer.push_back(h2);
  assert(processor.ApplyDiagonalFixtureCompensation(sParameters, zeroTransfer) ==
         vna::core::Status::kInvalidArgument);

  return 0;
}
