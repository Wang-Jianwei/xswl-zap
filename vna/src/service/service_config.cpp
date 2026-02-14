#include "service/service_config.h"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <sstream>

namespace vna {
namespace service {

std::string ServiceConfigLoader::Trim(const std::string& text) {
  std::size_t begin = 0;
  while (begin < text.size() && std::isspace(static_cast<unsigned char>(text[begin]))) {
    ++begin;
  }

  std::size_t end = text.size();
  while (end > begin && std::isspace(static_cast<unsigned char>(text[end - 1]))) {
    --end;
  }

  return text.substr(begin, end - begin);
}

bool ServiceConfigLoader::ParseBool(const std::string& text, bool& outValue) {
  std::string normalized = text;
  std::transform(normalized.begin(), normalized.end(), normalized.begin(),
                 [](unsigned char c) { return static_cast<char>(std::tolower(c)); });

  if (normalized == "true" || normalized == "1" || normalized == "yes") {
    outValue = true;
    return true;
  }
  if (normalized == "false" || normalized == "0" || normalized == "no") {
    outValue = false;
    return true;
  }

  return false;
}

bool ServiceConfigLoader::ParseUInt32(const std::string& text, std::uint32_t& outValue) {
  if (text.empty()) {
    return false;
  }

  std::istringstream iss(text);
  std::uint64_t parsed = 0;
  iss >> parsed;
  if (iss.fail() || !iss.eof() || parsed > 65535) {
    return false;
  }

  outValue = static_cast<std::uint32_t>(parsed);
  return true;
}

core::Status ServiceConfigLoader::LoadFromFile(const std::string& filePath,
                                               ServiceConfig& outConfig,
                                               std::vector<std::string>& outErrors) {
  outErrors.clear();

  if (filePath.empty()) {
    outErrors.push_back("service config path is empty");
    return core::Status::kInvalidArgument;
  }

  std::ifstream in(filePath.c_str());
  if (!in.is_open()) {
    outErrors.push_back("cannot open service config: " + filePath);
    return core::Status::kInvalidArgument;
  }

  ServiceConfig parsed = outConfig;

  std::string line;
  while (std::getline(in, line)) {
    const std::string trimmed = Trim(line);
    if (trimmed.empty() || trimmed[0] == '#') {
      continue;
    }

    const std::size_t colonPos = trimmed.find(':');
    if (colonPos == std::string::npos) {
      continue;
    }

    const std::string key = Trim(trimmed.substr(0, colonPos));
    const std::string value = Trim(trimmed.substr(colonPos + 1));

    if (key == "bind_address") {
      if (value.empty()) {
        outErrors.push_back("bind_address is empty");
      } else {
        parsed.bindAddress = value;
      }
      continue;
    }

    if (key == "port") {
      std::uint32_t port = 0;
      if (!ParseUInt32(value, port) || port == 0) {
        outErrors.push_back("port must be integer in range 1..65535");
      } else {
        parsed.port = port;
      }
      continue;
    }

    if (key == "tls_enabled") {
      bool enabled = false;
      if (!ParseBool(value, enabled)) {
        outErrors.push_back("tls_enabled must be boolean (true/false)");
      } else {
        parsed.tlsEnabled = enabled;
      }
      continue;
    }

    if (key == "log_level") {
      if (value.empty()) {
        outErrors.push_back("log_level is empty");
      } else {
        parsed.logLevel = value;
      }
      continue;
    }

    if (key == "stream_throttle_every_n_frames") {
      std::uint32_t interval = 0;
      if (!ParseUInt32(value, interval) || interval == 0) {
        outErrors.push_back("stream_throttle_every_n_frames must be integer in range 1..65535");
      } else {
        parsed.streamThrottleEveryNFrames = interval;
      }
      continue;
    }

    if (key == "stream_throttle_ms") {
      std::uint32_t delayMs = 0;
      if (!ParseUInt32(value, delayMs)) {
        outErrors.push_back("stream_throttle_ms must be integer in range 0..65535");
      } else {
        parsed.streamThrottleMs = delayMs;
      }
      continue;
    }

    if (key == "de_embedding_enabled") {
      bool enabled = false;
      if (!ParseBool(value, enabled)) {
        outErrors.push_back("de_embedding_enabled must be boolean (true/false)");
      } else {
        parsed.deEmbeddingEnabled = enabled;
      }
      continue;
    }

    if (key == "de_embedding_port_transfer") {
      parsed.deEmbeddingPortTransfer = value;
      continue;
    }

    if (key == "de_embedding_frequency_profiles") {
      parsed.deEmbeddingFrequencyProfiles = value;
      continue;
    }
  }

  if (!outErrors.empty()) {
    return core::Status::kInvalidArgument;
  }

  outConfig = parsed;
  return core::Status::kOk;
}

}  // namespace service
}  // namespace vna
