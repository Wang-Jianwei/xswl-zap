#include "core/measurement_exporter.h"

#include <cerrno>
#include <cctype>
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <sys/stat.h>

#ifdef _WIN32
#include <direct.h>
#endif

#include "core/s_parameter_math.h"

namespace vna {
namespace core {

namespace {

std::string FormatDouble(double value) {
  std::ostringstream stream;
  stream << std::setprecision(16) << value;
  return stream.str();
}

std::string EscapeJsonString(const std::string& value) {
  std::string escaped;
  escaped.reserve(value.size());
  for (std::size_t i = 0; i < value.size(); ++i) {
    const char c = value[i];
    switch (c) {
      case '"':
        escaped += "\\\"";
        break;
      case '\\':
        escaped += "\\\\";
        break;
      case '\b':
        escaped += "\\b";
        break;
      case '\f':
        escaped += "\\f";
        break;
      case '\n':
        escaped += "\\n";
        break;
      case '\r':
        escaped += "\\r";
        break;
      case '\t':
        escaped += "\\t";
        break;
      default:
        if (static_cast<unsigned char>(c) < 0x20) {
          std::ostringstream unicode;
          unicode << "\\u" << std::hex << std::setw(4) << std::setfill('0')
                  << static_cast<int>(static_cast<unsigned char>(c));
          escaped += unicode.str();
        } else {
          escaped += c;
        }
        break;
    }
  }
  return escaped;
}

void SkipWhitespace(const std::string& text, std::size_t& index) {
  while (index < text.size() && std::isspace(static_cast<unsigned char>(text[index])) != 0) {
    ++index;
  }
}

bool ConsumeChar(const std::string& text, std::size_t& index, char expected) {
  SkipWhitespace(text, index);
  if (index >= text.size() || text[index] != expected) {
    return false;
  }
  ++index;
  return true;
}

bool ParseJsonString(const std::string& text, std::size_t& index, std::string& out) {
  SkipWhitespace(text, index);
  if (index >= text.size() || text[index] != '"') {
    return false;
  }

  ++index;
  std::string value;
  while (index < text.size()) {
    const char c = text[index++];
    if (c == '"') {
      out = value;
      return true;
    }
    if (c != '\\') {
      value += c;
      continue;
    }

    if (index >= text.size()) {
      return false;
    }
    const char escaped = text[index++];
    switch (escaped) {
      case '"':
        value += '"';
        break;
      case '\\':
        value += '\\';
        break;
      case '/':
        value += '/';
        break;
      case 'b':
        value += '\b';
        break;
      case 'f':
        value += '\f';
        break;
      case 'n':
        value += '\n';
        break;
      case 'r':
        value += '\r';
        break;
      case 't':
        value += '\t';
        break;
      default:
        return false;
    }
  }

  return false;
}

bool ParseJsonNumber(const std::string& text, std::size_t& index, double& out) {
  SkipWhitespace(text, index);
  if (index >= text.size()) {
    return false;
  }

  std::size_t end = index;
  if (text[end] == '+' || text[end] == '-') {
    ++end;
  }
  bool hasDigits = false;
  while (end < text.size() && std::isdigit(static_cast<unsigned char>(text[end])) != 0) {
    hasDigits = true;
    ++end;
  }
  if (end < text.size() && text[end] == '.') {
    ++end;
    while (end < text.size() && std::isdigit(static_cast<unsigned char>(text[end])) != 0) {
      hasDigits = true;
      ++end;
    }
  }
  if (!hasDigits) {
    return false;
  }
  if (end < text.size() && (text[end] == 'e' || text[end] == 'E')) {
    ++end;
    if (end < text.size() && (text[end] == '+' || text[end] == '-')) {
      ++end;
    }
    bool expDigits = false;
    while (end < text.size() && std::isdigit(static_cast<unsigned char>(text[end])) != 0) {
      expDigits = true;
      ++end;
    }
    if (!expDigits) {
      return false;
    }
  }

  out = std::strtod(text.substr(index, end - index).c_str(), nullptr);
  index = end;
  return true;
}

bool ParseJsonUInt64(const std::string& text, std::size_t& index, std::uint64_t& out) {
  double parsed = 0.0;
  if (!ParseJsonNumber(text, index, parsed) || parsed < 0.0) {
    return false;
  }
  out = static_cast<std::uint64_t>(parsed);
  return true;
}

bool ParseJsonUInt32(const std::string& text, std::size_t& index, std::uint32_t& out) {
  double parsed = 0.0;
  if (!ParseJsonNumber(text, index, parsed) || parsed < 0.0) {
    return false;
  }
  out = static_cast<std::uint32_t>(parsed);
  return true;
}

bool ParseJsonBool(const std::string& text, std::size_t& index, bool& out) {
  SkipWhitespace(text, index);
  if (text.compare(index, 4, "true") == 0) {
    out = true;
    index += 4;
    return true;
  }
  if (text.compare(index, 5, "false") == 0) {
    out = false;
    index += 5;
    return true;
  }
  return false;
}

bool ParseKeyValueSeparator(const std::string& text, std::size_t& index) {
  return ConsumeChar(text, index, ':');
}

bool ParseReceiverChannels(const std::string& text,
                           std::size_t& index,
                           std::vector<ReceiverChannelSample>& channels) {
  if (!ConsumeChar(text, index, '[')) {
    return false;
  }

  SkipWhitespace(text, index);
  if (ConsumeChar(text, index, ']')) {
    return true;
  }

  while (true) {
    if (!ConsumeChar(text, index, '{')) {
      return false;
    }

    ReceiverChannelSample sample;
    bool hasChannelId = false;
    bool hasReal = false;
    bool hasImag = false;
    bool hasClipped = false;
    double real = 0.0;
    double imag = 0.0;

    while (true) {
      std::string key;
      if (!ParseJsonString(text, index, key) || !ParseKeyValueSeparator(text, index)) {
        return false;
      }

      if (key == "channel_id") {
        hasChannelId = ParseJsonString(text, index, sample.channelId);
      } else if (key == "real") {
        hasReal = ParseJsonNumber(text, index, real);
      } else if (key == "imag") {
        hasImag = ParseJsonNumber(text, index, imag);
      } else if (key == "clipped") {
        hasClipped = ParseJsonBool(text, index, sample.clipped);
      } else {
        return false;
      }

      SkipWhitespace(text, index);
      if (ConsumeChar(text, index, '}')) {
        break;
      }
      if (!ConsumeChar(text, index, ',')) {
        return false;
      }
    }

    if (!hasChannelId || !hasReal || !hasImag || !hasClipped) {
      return false;
    }
    sample.iq = std::complex<double>(real, imag);
    channels.push_back(sample);

    SkipWhitespace(text, index);
    if (ConsumeChar(text, index, ']')) {
      return true;
    }
    if (!ConsumeChar(text, index, ',')) {
      return false;
    }
  }
}

bool ParseReceiverPoints(const std::string& text,
                        std::size_t& index,
                        ReceiverData& receiverData) {
  if (!ConsumeChar(text, index, '[')) {
    return false;
  }

  SkipWhitespace(text, index);
  if (ConsumeChar(text, index, ']')) {
    return true;
  }

  while (true) {
    if (!ConsumeChar(text, index, '{')) {
      return false;
    }

    ReceiverFrequencyPoint point;
    bool hasFrequency = false;
    bool hasTimestamp = false;
    bool hasChannels = false;

    while (true) {
      std::string key;
      if (!ParseJsonString(text, index, key) || !ParseKeyValueSeparator(text, index)) {
        return false;
      }

      if (key == "frequency_hz") {
        hasFrequency = ParseJsonNumber(text, index, point.frequencyHz);
      } else if (key == "timestamp_ns") {
        hasTimestamp = ParseJsonUInt64(text, index, point.timestampNs);
      } else if (key == "channels") {
        hasChannels = ParseReceiverChannels(text, index, point.channels);
      } else {
        return false;
      }

      SkipWhitespace(text, index);
      if (ConsumeChar(text, index, '}')) {
        break;
      }
      if (!ConsumeChar(text, index, ',')) {
        return false;
      }
    }

    if (!hasFrequency || !hasTimestamp || !hasChannels) {
      return false;
    }
    receiverData.points.push_back(point);

    SkipWhitespace(text, index);
    if (ConsumeChar(text, index, ']')) {
      return true;
    }
    if (!ConsumeChar(text, index, ',')) {
      return false;
    }
  }
}

bool ParseSParameterEntries(const std::string& text,
                            std::size_t& index,
                            SParameterFrequencyPoint& point) {
  if (!ConsumeChar(text, index, '[')) {
    return false;
  }

  SkipWhitespace(text, index);
  if (ConsumeChar(text, index, ']')) {
    return true;
  }

  while (true) {
    if (!ConsumeChar(text, index, '{')) {
      return false;
    }

    std::uint32_t rowPort = 0;
    std::uint32_t colPort = 0;
    double real = 0.0;
    double imag = 0.0;
    bool hasRow = false;
    bool hasCol = false;
    bool hasReal = false;
    bool hasImag = false;

    while (true) {
      std::string key;
      if (!ParseJsonString(text, index, key) || !ParseKeyValueSeparator(text, index)) {
        return false;
      }

      if (key == "row_port") {
        hasRow = ParseJsonUInt32(text, index, rowPort);
      } else if (key == "col_port") {
        hasCol = ParseJsonUInt32(text, index, colPort);
      } else if (key == "real") {
        hasReal = ParseJsonNumber(text, index, real);
      } else if (key == "imag") {
        hasImag = ParseJsonNumber(text, index, imag);
      } else {
        return false;
      }

      SkipWhitespace(text, index);
      if (ConsumeChar(text, index, '}')) {
        break;
      }
      if (!ConsumeChar(text, index, ',')) {
        return false;
      }
    }

    if (!hasRow || !hasCol || !hasReal || !hasImag || rowPort == 0 || colPort == 0 ||
        rowPort > point.portCount || colPort > point.portCount) {
      return false;
    }

    const std::size_t n = static_cast<std::size_t>(point.portCount);
    const std::size_t matrixIndex = static_cast<std::size_t>(rowPort - 1) * n +
                                    static_cast<std::size_t>(colPort - 1);
    if (matrixIndex >= point.matrix.size()) {
      return false;
    }
    point.matrix[matrixIndex] = std::complex<double>(real, imag);

    SkipWhitespace(text, index);
    if (ConsumeChar(text, index, ']')) {
      return true;
    }
    if (!ConsumeChar(text, index, ',')) {
      return false;
    }
  }
}

bool ParseSParameterPoints(const std::string& text,
                           std::size_t& index,
                           SParameterData& sParameterData) {
  if (!ConsumeChar(text, index, '[')) {
    return false;
  }

  SkipWhitespace(text, index);
  if (ConsumeChar(text, index, ']')) {
    return true;
  }

  while (true) {
    if (!ConsumeChar(text, index, '{')) {
      return false;
    }

    SParameterFrequencyPoint point;
    bool hasFrequency = false;
    bool hasPortCount = false;
    bool hasPoints = false;

    while (true) {
      std::string key;
      if (!ParseJsonString(text, index, key) || !ParseKeyValueSeparator(text, index)) {
        return false;
      }

      if (key == "frequency_hz") {
        hasFrequency = ParseJsonNumber(text, index, point.frequencyHz);
      } else if (key == "port_count") {
        hasPortCount = ParseJsonUInt32(text, index, point.portCount);
        if (hasPortCount && point.portCount > 0) {
          const std::size_t n = static_cast<std::size_t>(point.portCount);
          point.matrix.assign(n * n, std::complex<double>(0.0, 0.0));
        }
      } else if (key == "points") {
        if (point.portCount == 0) {
          return false;
        }
        hasPoints = ParseSParameterEntries(text, index, point);
      } else {
        return false;
      }

      SkipWhitespace(text, index);
      if (ConsumeChar(text, index, '}')) {
        break;
      }
      if (!ConsumeChar(text, index, ',')) {
        return false;
      }
    }

    if (!hasFrequency || !hasPortCount || !hasPoints) {
      return false;
    }
    sParameterData.points.push_back(point);

    SkipWhitespace(text, index);
    if (ConsumeChar(text, index, ']')) {
      return true;
    }
    if (!ConsumeChar(text, index, ',')) {
      return false;
    }
  }
}

std::string GetParentPath(const std::string& path) {
  const std::size_t pos = path.find_last_of("\\/");
  if (pos == std::string::npos) {
    return "";
  }
  return path.substr(0, pos);
}

bool IsDirectory(const std::string& path) {
  if (path.empty()) {
    return false;
  }

  struct stat info;
  if (stat(path.c_str(), &info) != 0) {
    return false;
  }

  return (info.st_mode & S_IFDIR) != 0;
}

bool CreateDirectorySingle(const std::string& path) {
#ifdef _WIN32
  const int rc = _mkdir(path.c_str());
#else
  const int rc = mkdir(path.c_str(), 0755);
#endif
  if (rc == 0 || errno == EEXIST) {
    return true;
  }
  return false;
}

bool EnsureDirectoryRecursive(const std::string& rawPath) {
  if (rawPath.empty()) {
    return true;
  }

  std::string path = rawPath;
  for (std::size_t i = 0; i < path.size(); ++i) {
    if (path[i] == '\\') {
      path[i] = '/';
    }
  }

  std::string current;
  std::size_t start = 0;
  if (path.size() > 1 && path[1] == ':') {
    current = path.substr(0, 2);
    start = 2;
  }
  if (!path.empty() && path[0] == '/') {
    current = "/";
    start = 1;
  }

  while (start < path.size()) {
    const std::size_t slashPos = path.find('/', start);
    const std::string part = path.substr(start, slashPos == std::string::npos ? std::string::npos : slashPos - start);
    if (!part.empty()) {
      if (!current.empty() && current[current.size() - 1] != '/' && current[current.size() - 1] != ':') {
        current += '/';
      }
      current += part;

      if (!IsDirectory(current) && !CreateDirectorySingle(current)) {
        return false;
      }
    }

    if (slashPos == std::string::npos) {
      break;
    }
    start = slashPos + 1;
  }

  return true;
}

std::complex<double> ReadMatrixPoint(const SParameterFrequencyPoint& point,
                                     std::size_t row,
                                     std::size_t col) {
  if (point.portCount == 0) {
    return std::complex<double>(0.0, 0.0);
  }

  const std::size_t n = static_cast<std::size_t>(point.portCount);
  const std::size_t index = row * n + col;
  if (index >= point.matrix.size()) {
    return std::complex<double>(0.0, 0.0);
  }

  return point.matrix[index];
}

}  // namespace

Status MeasurementExporter::ExportCsv(const AcquisitionResult& result,
                                      const std::string& outputPath,
                                      std::string* errorMessage) {
  if (outputPath.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = "csv export path is empty";
    }
    return Status::kInvalidArgument;
  }

  const std::string parentPath = GetParentPath(outputPath);
  if (!parentPath.empty() && !EnsureDirectoryRecursive(parentPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to create csv output directory: " + parentPath;
    }
    return Status::kInvalidArgument;
  }

  std::ofstream out(outputPath.c_str(), std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to open csv output path: " + outputPath;
    }
    return Status::kInvalidArgument;
  }

  out << "frequency_hz,data_product,channel,row_port,col_port,real,imag,magnitude_db,phase_deg,clipped,timestamp_ns\n";

  for (std::size_t i = 0; i < result.receiverRaw.points.size(); ++i) {
    const ReceiverFrequencyPoint& point = result.receiverRaw.points[i];
    for (std::size_t channelIndex = 0; channelIndex < point.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& channel = point.channels[channelIndex];
      out << FormatDouble(point.frequencyHz) << ",receiver_raw," << channel.channelId
          << ",0,0," << FormatDouble(channel.iq.real()) << "," << FormatDouble(channel.iq.imag())
          << "," << FormatDouble(SParameterMath::MagnitudeDb(channel.iq))
          << "," << FormatDouble(SParameterMath::PhaseDeg(channel.iq))
          << "," << (channel.clipped ? "true" : "false") << "," << point.timestampNs << "\n";
    }
  }

  for (std::size_t i = 0; i < result.receiverCompensated.points.size(); ++i) {
    const ReceiverFrequencyPoint& point = result.receiverCompensated.points[i];
    for (std::size_t channelIndex = 0; channelIndex < point.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& channel = point.channels[channelIndex];
      out << FormatDouble(point.frequencyHz) << ",receiver_compensated," << channel.channelId
          << ",0,0," << FormatDouble(channel.iq.real()) << "," << FormatDouble(channel.iq.imag())
          << "," << FormatDouble(SParameterMath::MagnitudeDb(channel.iq))
          << "," << FormatDouble(SParameterMath::PhaseDeg(channel.iq))
          << "," << (channel.clipped ? "true" : "false") << "," << point.timestampNs << "\n";
    }
  }

  for (std::size_t i = 0; i < result.sParameters.points.size(); ++i) {
    const SParameterFrequencyPoint& point = result.sParameters.points[i];
    const std::size_t portCount = static_cast<std::size_t>(point.portCount);
    for (std::size_t row = 0; row < portCount; ++row) {
      for (std::size_t col = 0; col < portCount; ++col) {
        const std::complex<double> value = ReadMatrixPoint(point, row, col);
        out << FormatDouble(point.frequencyHz) << ",s_parameter,," << (row + 1) << "," << (col + 1)
            << "," << FormatDouble(value.real()) << "," << FormatDouble(value.imag())
            << "," << FormatDouble(SParameterMath::MagnitudeDb(value))
            << "," << FormatDouble(SParameterMath::PhaseDeg(value))
            << ",false,0\n";
      }
    }
  }

  if (!out.good()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to write csv output path: " + outputPath;
    }
    return Status::kInternalError;
  }

  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return Status::kOk;
}

Status MeasurementExporter::ExportJson(const AcquisitionResult& result,
                                       const std::string& outputPath,
                                       std::string* errorMessage) {
  if (outputPath.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = "json export path is empty";
    }
    return Status::kInvalidArgument;
  }

  const std::string parentPath = GetParentPath(outputPath);
  if (!parentPath.empty() && !EnsureDirectoryRecursive(parentPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to create json output directory: " + parentPath;
    }
    return Status::kInvalidArgument;
  }

  std::ofstream out(outputPath.c_str(), std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to open json output path: " + outputPath;
    }
    return Status::kInvalidArgument;
  }

  out << "{\n";
  out << "  \"instance_id\": \"" << EscapeJsonString(result.instanceId) << "\",\n";
  out << "  \"timestamp_ns\": " << result.timestampNs << ",\n";
  out << "  \"receiver_raw_points\": [\n";

  for (std::size_t i = 0; i < result.receiverRaw.points.size(); ++i) {
    const ReceiverFrequencyPoint& point = result.receiverRaw.points[i];
    out << "    {\"frequency_hz\": " << FormatDouble(point.frequencyHz)
        << ", \"timestamp_ns\": " << point.timestampNs
        << ", \"channels\": [";
    for (std::size_t c = 0; c < point.channels.size(); ++c) {
      const ReceiverChannelSample& channel = point.channels[c];
      out << "{\"channel_id\": \"" << EscapeJsonString(channel.channelId)
          << "\", \"real\": " << FormatDouble(channel.iq.real())
          << ", \"imag\": " << FormatDouble(channel.iq.imag())
          << ", \"clipped\": " << (channel.clipped ? "true" : "false") << "}";
      if (c + 1 < point.channels.size()) {
        out << ", ";
      }
    }
    out << "]}";
    if (i + 1 < result.receiverRaw.points.size()) {
      out << ",";
    }
    out << "\n";
  }

  out << "  ],\n";
  out << "  \"receiver_compensated_points\": [\n";
  for (std::size_t i = 0; i < result.receiverCompensated.points.size(); ++i) {
    const ReceiverFrequencyPoint& point = result.receiverCompensated.points[i];
    out << "    {\"frequency_hz\": " << FormatDouble(point.frequencyHz)
        << ", \"timestamp_ns\": " << point.timestampNs
        << ", \"channels\": [";
    for (std::size_t c = 0; c < point.channels.size(); ++c) {
      const ReceiverChannelSample& channel = point.channels[c];
      out << "{\"channel_id\": \"" << EscapeJsonString(channel.channelId)
          << "\", \"real\": " << FormatDouble(channel.iq.real())
          << ", \"imag\": " << FormatDouble(channel.iq.imag())
          << ", \"clipped\": " << (channel.clipped ? "true" : "false") << "}";
      if (c + 1 < point.channels.size()) {
        out << ", ";
      }
    }
    out << "]}";
    if (i + 1 < result.receiverCompensated.points.size()) {
      out << ",";
    }
    out << "\n";
  }

  out << "  ],\n";
  out << "  \"s_parameter_points\": [\n";
  for (std::size_t i = 0; i < result.sParameters.points.size(); ++i) {
    const SParameterFrequencyPoint& point = result.sParameters.points[i];
    const std::size_t n = static_cast<std::size_t>(point.portCount);
    out << "    {\"frequency_hz\": " << FormatDouble(point.frequencyHz)
        << ", \"port_count\": " << point.portCount
        << ", \"points\": [";

    bool first = true;
    for (std::size_t row = 0; row < n; ++row) {
      for (std::size_t col = 0; col < n; ++col) {
        const std::complex<double> value = ReadMatrixPoint(point, row, col);
        if (!first) {
          out << ", ";
        }
        first = false;
        out << "{\"row_port\": " << static_cast<std::uint32_t>(row + 1)
            << ", \"col_port\": " << static_cast<std::uint32_t>(col + 1)
            << ", \"real\": " << FormatDouble(value.real())
            << ", \"imag\": " << FormatDouble(value.imag()) << "}";
      }
    }

    out << "]}";
    if (i + 1 < result.sParameters.points.size()) {
      out << ",";
    }
    out << "\n";
  }
  out << "  ]\n";
  out << "}\n";

  if (!out.good()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to write json output path: " + outputPath;
    }
    return Status::kInternalError;
  }

  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return Status::kOk;
}

Status MeasurementExporter::ImportJson(const std::string& inputPath,
                                       AcquisitionResult& out,
                                       std::string* errorMessage) {
  if (inputPath.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = "json import path is empty";
    }
    return Status::kInvalidArgument;
  }

  std::ifstream in(inputPath.c_str(), std::ios::in);
  if (!in.is_open()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to open json input path: " + inputPath;
    }
    return Status::kInvalidArgument;
  }

  std::stringstream buffer;
  buffer << in.rdbuf();
  const std::string text = buffer.str();
  std::size_t index = 0;

  if (!ConsumeChar(text, index, '{')) {
    if (errorMessage != nullptr) {
      *errorMessage = "invalid json content";
    }
    return Status::kInvalidArgument;
  }

  AcquisitionResult parsed;
  parsed.dataType = AcquisitionDataType::kFrequencyDomain;
  bool hasInstanceId = false;
  bool hasTimestamp = false;
  bool hasReceiverRaw = false;
  bool hasReceiverCompensated = false;
  bool hasSParameters = false;

  while (true) {
    SkipWhitespace(text, index);
    if (ConsumeChar(text, index, '}')) {
      break;
    }

    std::string key;
    if (!ParseJsonString(text, index, key) || !ParseKeyValueSeparator(text, index)) {
      if (errorMessage != nullptr) {
        *errorMessage = "invalid json object key/value";
      }
      return Status::kInvalidArgument;
    }

    if (key == "instance_id") {
      hasInstanceId = ParseJsonString(text, index, parsed.instanceId);
    } else if (key == "timestamp_ns") {
      hasTimestamp = ParseJsonUInt64(text, index, parsed.timestampNs);
    } else if (key == "receiver_raw_points") {
      hasReceiverRaw = ParseReceiverPoints(text, index, parsed.receiverRaw);
    } else if (key == "receiver_compensated_points") {
      hasReceiverCompensated = ParseReceiverPoints(text, index, parsed.receiverCompensated);
    } else if (key == "s_parameter_points") {
      hasSParameters = ParseSParameterPoints(text, index, parsed.sParameters);
    } else {
      if (errorMessage != nullptr) {
        *errorMessage = "unknown json field: " + key;
      }
      return Status::kInvalidArgument;
    }

    if ((!hasInstanceId && key == "instance_id") || (!hasTimestamp && key == "timestamp_ns") ||
        (!hasReceiverRaw && key == "receiver_raw_points") ||
        (!hasReceiverCompensated && key == "receiver_compensated_points") ||
        (!hasSParameters && key == "s_parameter_points")) {
      if (errorMessage != nullptr) {
        *errorMessage = "invalid json field value: " + key;
      }
      return Status::kInvalidArgument;
    }

    SkipWhitespace(text, index);
    if (ConsumeChar(text, index, '}')) {
      break;
    }
    if (!ConsumeChar(text, index, ',')) {
      if (errorMessage != nullptr) {
        *errorMessage = "invalid json object separator";
      }
      return Status::kInvalidArgument;
    }
  }

  if (!hasInstanceId || !hasTimestamp || !hasReceiverRaw || !hasReceiverCompensated ||
      !hasSParameters) {
    if (errorMessage != nullptr) {
      *errorMessage = "json import missing required fields";
    }
    return Status::kInvalidArgument;
  }

  out = parsed;
  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return Status::kOk;
}

Status MeasurementExporter::ExportTouchstone(const AcquisitionResult& result,
                                             const std::string& outputPath,
                                             std::string* errorMessage) {
  if (outputPath.empty() || result.sParameters.points.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = outputPath.empty()
                          ? "touchstone export path is empty"
                          : "touchstone export requires non-empty s-parameter points";
    }
    return Status::kInvalidArgument;
  }

  const std::string parentPath = GetParentPath(outputPath);
  if (!parentPath.empty() && !EnsureDirectoryRecursive(parentPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to create touchstone output directory: " + parentPath;
    }
    return Status::kInvalidArgument;
  }

  const std::uint32_t portCount = result.sParameters.points.front().portCount;
  if (portCount == 0) {
    if (errorMessage != nullptr) {
      *errorMessage = "touchstone export requires non-zero port count";
    }
    return Status::kInvalidArgument;
  }

  std::ofstream out(outputPath.c_str(), std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to open touchstone output path: " + outputPath;
    }
    return Status::kInvalidArgument;
  }

  out << "! xswl-zap-vna Touchstone export\n";
  out << "# Hz S RI R 50\n";

  const std::size_t n = static_cast<std::size_t>(portCount);
  for (std::size_t pointIndex = 0; pointIndex < result.sParameters.points.size(); ++pointIndex) {
    const SParameterFrequencyPoint& point = result.sParameters.points[pointIndex];
    out << FormatDouble(point.frequencyHz);

    for (std::size_t col = 0; col < n; ++col) {
      for (std::size_t row = 0; row < n; ++row) {
        const std::complex<double> value = ReadMatrixPoint(point, row, col);
        out << " " << FormatDouble(value.real()) << " " << FormatDouble(value.imag());
      }
    }

    out << "\n";
  }

  if (!out.good()) {
    if (errorMessage != nullptr) {
      *errorMessage = "failed to write touchstone output path: " + outputPath;
    }
    return Status::kInternalError;
  }

  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return Status::kOk;
}

}  // namespace core
}  // namespace vna
