#pragma once

#include <complex>
#include <string>
#include <vector>

#include "core/processors/de_embedding_processor.h"

namespace vna {
namespace service {

bool ParseDeEmbeddingPortTransfer(const std::string& text,
                                  std::vector<std::complex<double> >& out,
                                  std::string& error);

bool ParseDeEmbeddingFrequencyProfiles(
    const std::string& text,
    std::vector<core::processors::FrequencyPortTransferProfile>& out,
    std::string& error);

}  // namespace service
}  // namespace vna
