#include "core/topology_parser.h"

#include <cctype>
#include <map>

namespace vna {
namespace core {

std::string TopologyParser::Trim(const std::string& s) {
  std::size_t begin = 0;
  while (begin < s.size() && std::isspace(static_cast<unsigned char>(s[begin]))) {
    ++begin;
  }

  std::size_t end = s.size();
  while (end > begin && std::isspace(static_cast<unsigned char>(s[end - 1]))) {
    --end;
  }

  return s.substr(begin, end - begin);
}

bool TopologyParser::StartsWith(const std::string& s, const std::string& prefix) {
  return s.size() >= prefix.size() && s.compare(0, prefix.size(), prefix) == 0;
}

TopologyParser::ParseResult TopologyParser::ParseInstances(const std::string& yaml,
                                                           const std::string& workspaceId,
                                                           std::uint32_t defaultLeaseTtlSeconds) const {
  ParseResult result;

  if (workspaceId.empty()) {
    result.status = Status::kInvalidArgument;
    result.errors.push_back("workspaceId is required");
    return result;
  }

  if (yaml.empty()) {
    result.status = Status::kInvalidArgument;
    result.errors.push_back("topology yaml is empty");
    return result;
  }

  bool inInstances = false;

  // Accumulate fields for the current instance.
  std::map<std::string, std::string> fields;
  bool hasCurrent = false;

  const auto flushCurrent = [&]() {
    if (!hasCurrent) {
      return;
    }

    InstanceConfig config;
    config.workspaceId = workspaceId;
    config.instanceId = fields["id"];
    config.driverType = fields["driver"];
    config.deviceIdentifier = fields["device"];
    config.resourceId = fields["resource"];
    config.leaseTtlSeconds = defaultLeaseTtlSeconds;

    bool ok = true;
    if (config.instanceId.empty()) {
      ok = false;
      result.errors.push_back("instance missing id");
    }
    if (config.driverType.empty()) {
      ok = false;
      result.errors.push_back("instance missing driver");
    }
    if (config.deviceIdentifier.empty()) {
      ok = false;
      result.errors.push_back("instance missing device");
    }
    if (config.resourceId.empty()) {
      ok = false;
      result.errors.push_back("instance missing resource");
    }

    if (ok) {
      result.instances.push_back(config);
    } else {
      result.status = Status::kInvalidArgument;
    }
  };

  std::string line;
  for (std::size_t i = 0; i < yaml.size(); ++i) {
    const char c = yaml[i];
    if (c == '\r') {
      continue;
    }

    if (c == '\n') {
      const std::string raw = line;
      line.clear();

      const std::string t = Trim(raw);
      if (t.empty() || StartsWith(t, "#")) {
        continue;
      }

      if (!inInstances) {
        if (t == "instances:" || StartsWith(t, "instances:")) {
          inInstances = true;
        }
        continue;
      }

      // Start of a new item.
      if (StartsWith(t, "-") && t.find("id:") != std::string::npos) {
        flushCurrent();
        fields.clear();
        hasCurrent = true;

        const std::size_t pos = t.find("id:");
        fields["id"] = Trim(t.substr(pos + 3));
        continue;
      }

      // key: value lines.
      const std::size_t colonPos = t.find(':');
      if (colonPos == std::string::npos) {
        continue;
      }

      const std::string key = Trim(t.substr(0, colonPos));
      const std::string value = Trim(t.substr(colonPos + 1));
      if (key == "driver" || key == "device" || key == "resource" || key == "id") {
        if (!hasCurrent) {
          // Not inside an instance item yet.
          continue;
        }
        fields[key] = value;
      }

      continue;
    }

    line.push_back(c);
  }

  // flush last line
  if (!line.empty()) {
    const std::string t = Trim(line);
    if (!t.empty() && inInstances) {
      if (StartsWith(t, "-") && t.find("id:") != std::string::npos) {
        flushCurrent();
        fields.clear();
        hasCurrent = true;
        const std::size_t pos = t.find("id:");
        fields["id"] = Trim(t.substr(pos + 3));
      } else {
        const std::size_t colonPos = t.find(':');
        if (colonPos != std::string::npos) {
          const std::string key = Trim(t.substr(0, colonPos));
          const std::string value = Trim(t.substr(colonPos + 1));
          if (key == "driver" || key == "device" || key == "resource" || key == "id") {
            if (hasCurrent) {
              fields[key] = value;
            }
          }
        }
      }
    }
  }

  flushCurrent();

  if (result.status == Status::kOk && result.instances.empty()) {
    result.status = Status::kInvalidArgument;
    result.errors.push_back("no instances found");
  }

  return result;
}

}  // namespace core
}  // namespace vna
