#include "service/de_embedding_config_parser.h"

#include <cctype>
#include <sstream>

namespace vna {
namespace service {

namespace {

std::string TrimText(const std::string& text) {
  std::size_t begin = 0;
  while (begin < text.size() && std::isspace(static_cast<unsigned char>(text[begin])) != 0) {
    ++begin;
  }

  std::size_t end = text.size();
  while (end > begin && std::isspace(static_cast<unsigned char>(text[end - 1])) != 0) {
    --end;
  }

  return text.substr(begin, end - begin);
}

bool ParseDoubleStrict(const std::string& text, double& outValue) {
  std::stringstream parser(text);
  parser >> outValue;
  return !parser.fail() && parser.eof();
}

}  // namespace

bool ParseDeEmbeddingPortTransfer(const std::string& text,
                                  std::vector<std::complex<double> >& out,
                                  std::string& error) {
  out.clear();
  error.clear();

  if (text.empty()) {
    error = "de_embedding_port_transfer is empty";
    return false;
  }

  std::stringstream ss(text);
  std::string token;
  std::size_t index = 0;
  while (std::getline(ss, token, ',')) {
    const std::string trimmed = TrimText(token);
    if (trimmed.empty()) {
      error = "de_embedding_port_transfer contains empty item";
      return false;
    }

    double value = 0.0;
    if (!ParseDoubleStrict(trimmed, value)) {
      error = "de_embedding_port_transfer item " + std::to_string(index) +
              " must be a valid double";
      return false;
    }

    out.push_back(std::complex<double>(value, 0.0));
    ++index;
  }

  if (out.empty()) {
    error = "de_embedding_port_transfer produced no values";
    return false;
  }

  return true;
}

bool ParseDeEmbeddingFrequencyProfiles(
    const std::string& text,
    std::vector<core::processors::FrequencyPortTransferProfile>& out,
    std::string& error) {
  out.clear();
  error.clear();

  if (text.empty()) {
    error = "de_embedding_frequency_profiles is empty";
    return false;
  }

  std::stringstream profileStream(text);
  std::string profileToken;
  std::size_t expectedPortCount = 0;
  while (std::getline(profileStream, profileToken, ';')) {
    const std::string trimmedProfile = TrimText(profileToken);
    if (trimmedProfile.empty()) {
      continue;
    }

    const std::size_t colonPos = trimmedProfile.find(':');
    if (colonPos == std::string::npos) {
      error = "profile must use '<frequency>:<transfer-list>' format";
      return false;
    }

    const std::string freqText = TrimText(trimmedProfile.substr(0, colonPos));
    const std::string transferText = TrimText(trimmedProfile.substr(colonPos + 1));

    double frequencyHz = 0.0;
    if (!ParseDoubleStrict(freqText, frequencyHz) || frequencyHz <= 0.0) {
      error = "profile frequency must be positive double";
      return false;
    }

    std::vector<std::complex<double> > transfer;
    std::string transferError;
    if (!ParseDeEmbeddingPortTransfer(transferText, transfer, transferError)) {
      error = transferError;
      return false;
    }

    if (expectedPortCount == 0) {
      expectedPortCount = transfer.size();
    } else if (transfer.size() != expectedPortCount) {
      error = "all de_embedding_frequency_profiles entries must use equal port count";
      return false;
    }

    core::processors::FrequencyPortTransferProfile profile;
    profile.frequencyHz = frequencyHz;
    profile.portTransfer = transfer;
    out.push_back(profile);
  }

  if (out.empty()) {
    error = "de_embedding_frequency_profiles produced no valid profiles";
    return false;
  }

  return true;
}

}  // namespace service
}  // namespace vna
