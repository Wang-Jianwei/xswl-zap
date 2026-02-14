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

  vna::core::SParameterData frequencyData;
  vna::core::SParameterFrequencyPoint pointA;
  pointA.frequencyHz = 1.0e9;
  pointA.portCount = 2;
  pointA.matrix.push_back(s11Ideal * std::complex<double>(2.0, 0.0) * std::complex<double>(2.0, 0.0));
  pointA.matrix.push_back(s12Ideal * std::complex<double>(2.0, 0.0) * std::complex<double>(1.0, 0.0));
  pointA.matrix.push_back(s21Ideal * std::complex<double>(1.0, 0.0) * std::complex<double>(2.0, 0.0));
  pointA.matrix.push_back(s22Ideal * std::complex<double>(1.0, 0.0) * std::complex<double>(1.0, 0.0));

  vna::core::SParameterFrequencyPoint pointB = pointA;
  pointB.frequencyHz = 2.0e9;
  pointB.matrix[0] = s11Ideal * std::complex<double>(4.0, 0.0) * std::complex<double>(4.0, 0.0);
  pointB.matrix[1] = s12Ideal * std::complex<double>(4.0, 0.0) * std::complex<double>(2.0, 0.0);
  pointB.matrix[2] = s21Ideal * std::complex<double>(2.0, 0.0) * std::complex<double>(4.0, 0.0);
  pointB.matrix[3] = s22Ideal * std::complex<double>(2.0, 0.0) * std::complex<double>(2.0, 0.0);

  frequencyData.points.push_back(pointA);
  frequencyData.points.push_back(pointB);

  std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
  vna::core::processors::FrequencyPortTransferProfile profileA;
  profileA.frequencyHz = 1.0e9;
  profileA.portTransfer.push_back(std::complex<double>(2.0, 0.0));
  profileA.portTransfer.push_back(std::complex<double>(1.0, 0.0));
  profiles.push_back(profileA);

  vna::core::processors::FrequencyPortTransferProfile profileB;
       profileB.frequencyHz = 3.0e9;
       profileB.portTransfer.push_back(std::complex<double>(6.0, 0.0));
       profileB.portTransfer.push_back(std::complex<double>(3.0, 0.0));
  profiles.push_back(profileB);

  assert(processor.ApplyFrequencyDependentDiagonalFixtureCompensation(frequencyData, profiles) ==
         vna::core::Status::kOk);
  assert(std::abs(frequencyData.points[0].matrix[0] - s11Ideal) < 1e-12);
  // 2.0e9 point should use interpolation between 1.0e9 (2,1) and 3.0e9 (6,3) => (4,2)
  assert(std::abs(frequencyData.points[1].matrix[0] - s11Ideal) < 1e-12);

  profiles[1].portTransfer.clear();
  assert(processor.ApplyFrequencyDependentDiagonalFixtureCompensation(frequencyData, profiles) ==
         vna::core::Status::kInvalidArgument);

  // Unsorted profile input should still be handled correctly via internal sort.
  vna::core::SParameterData unsortedData;
  vna::core::SParameterFrequencyPoint unsortedPoint = pointA;
  unsortedPoint.frequencyHz = 2.0e9;
       unsortedPoint.matrix[0] = s11Ideal * std::complex<double>(4.0, 0.0) * std::complex<double>(4.0, 0.0);
       unsortedPoint.matrix[1] = s12Ideal * std::complex<double>(4.0, 0.0) * std::complex<double>(2.0, 0.0);
       unsortedPoint.matrix[2] = s21Ideal * std::complex<double>(2.0, 0.0) * std::complex<double>(4.0, 0.0);
       unsortedPoint.matrix[3] = s22Ideal * std::complex<double>(2.0, 0.0) * std::complex<double>(2.0, 0.0);
  unsortedData.points.push_back(unsortedPoint);

  std::vector<vna::core::processors::FrequencyPortTransferProfile> unsortedProfiles;
  vna::core::processors::FrequencyPortTransferProfile high;
  high.frequencyHz = 3.0e9;
  high.portTransfer.push_back(std::complex<double>(6.0, 0.0));
  high.portTransfer.push_back(std::complex<double>(3.0, 0.0));
  unsortedProfiles.push_back(high);

  vna::core::processors::FrequencyPortTransferProfile low;
  low.frequencyHz = 1.0e9;
  low.portTransfer.push_back(std::complex<double>(2.0, 0.0));
  low.portTransfer.push_back(std::complex<double>(1.0, 0.0));
  unsortedProfiles.push_back(low);

  assert(processor.ApplyFrequencyDependentDiagonalFixtureCompensation(unsortedData, unsortedProfiles) ==
         vna::core::Status::kOk);
  assert(std::abs(unsortedData.points[0].matrix[0] - s11Ideal) < 1e-12);

  return 0;
}
