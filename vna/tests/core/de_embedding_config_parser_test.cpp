#include <cassert>
#include <complex>
#include <string>
#include <vector>

#include "service/de_embedding_config_parser.h"

int main() {
  {
    std::vector<std::complex<double> > values;
    std::string error;
    const bool ok = vna::service::ParseDeEmbeddingPortTransfer("1.0, 0.5,2.0", values, error);
    assert(ok);
    assert(error.empty());
    assert(values.size() == 3);
    assert(values[0].real() == 1.0 && values[0].imag() == 0.0);
    assert(values[1].real() == 0.5 && values[1].imag() == 0.0);
    assert(values[2].real() == 2.0 && values[2].imag() == 0.0);
  }

  {
    std::vector<std::complex<double> > values;
    std::string error;
    const bool ok = vna::service::ParseDeEmbeddingPortTransfer("1.0, ,2.0", values, error);
    assert(!ok);
    assert(!error.empty());
  }

  {
    std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
    std::string error;
    const bool ok = vna::service::ParseDeEmbeddingFrequencyProfiles(
        "1e9:1.0,1.0;2e9:0.9,0.9", profiles, error);
    assert(ok);
    assert(error.empty());
    assert(profiles.size() == 2);
    assert(profiles[0].frequencyHz == 1e9);
    assert(profiles[1].frequencyHz == 2e9);
    assert(profiles[0].portTransfer.size() == 2);
    assert(profiles[1].portTransfer.size() == 2);
  }

  {
    std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
    std::string error;
    const bool ok = vna::service::ParseDeEmbeddingFrequencyProfiles(
        "1e9:1.0,1.0;2e9:0.9", profiles, error);
    assert(!ok);
    assert(error == "all de_embedding_frequency_profiles entries must use equal port count");
  }

  {
    std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
    std::string error;
    const bool ok = vna::service::ParseDeEmbeddingFrequencyProfiles("-1:1.0,1.0", profiles, error);
    assert(!ok);
    assert(error == "profile frequency must be positive double");
  }

  return 0;
}
