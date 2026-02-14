#include <chrono>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

#include <grpcpp/grpcpp.h>

#include "vna.grpc.pb.h"

namespace {

struct Options {
  std::string endpoint = "127.0.0.1:50051";
  std::string inputDir;
  std::string outputJsonPath;
  std::string instanceId = "inst0";
  std::string mode = "frequency";
  int sampleCount = 128;
  int timeoutMs = 1000;
  double tolerance = 1e-6;
  bool failOnMismatch = false;
  bool failOnFailed = false;
};

struct CaseResult {
  int index = 0;
  std::string jsonPath;
  std::string status;
  std::string detail;
  std::string grpcCompareToken;
  std::string error;
};

void PrintUsage() {
  std::cout
      << "Usage: easy_grpc_batch_compare --input-dir <dir> --output-json <path> [options]\n"
      << "Options:\n"
      << "  --endpoint <host:port>      default: 127.0.0.1:50051\n"
      << "  --instance-id <id>          default: inst0\n"
      << "  --mode <frequency|time>     default: frequency\n"
      << "  --sample-count <int>        default: 128\n"
      << "  --timeout-ms <int>          default: 1000\n"
      << "  --tolerance <double>        default: 1e-6\n"
      << "  --fail-on-mismatch          return non-zero when mismatched>0\n"
      << "  --fail-on-failed            return non-zero when failed>0\n";
}

bool ParseInt(const std::string& text, int& value) {
  std::stringstream ss(text);
  ss >> value;
  return !ss.fail() && ss.eof();
}

bool ParseDouble(const std::string& text, double& value) {
  std::stringstream ss(text);
  ss >> value;
  return !ss.fail() && ss.eof();
}

bool ParseArgs(int argc, char** argv, Options& options) {
  for (int i = 1; i < argc; ++i) {
    const std::string arg = argv[i];

    auto requireValue = [&](std::string& outValue) -> bool {
      if (i + 1 >= argc) {
        std::cout << "Missing value for argument: " << arg << "\n";
        return false;
      }
      outValue = argv[++i];
      return true;
    };

    if (arg == "--endpoint") {
      if (!requireValue(options.endpoint)) {
        return false;
      }
    } else if (arg == "--input-dir") {
      if (!requireValue(options.inputDir)) {
        return false;
      }
    } else if (arg == "--output-json") {
      if (!requireValue(options.outputJsonPath)) {
        return false;
      }
    } else if (arg == "--instance-id") {
      if (!requireValue(options.instanceId)) {
        return false;
      }
    } else if (arg == "--mode") {
      if (!requireValue(options.mode)) {
        return false;
      }
    } else if (arg == "--sample-count") {
      std::string text;
      if (!requireValue(text) || !ParseInt(text, options.sampleCount)) {
        std::cout << "Invalid --sample-count\n";
        return false;
      }
    } else if (arg == "--timeout-ms") {
      std::string text;
      if (!requireValue(text) || !ParseInt(text, options.timeoutMs)) {
        std::cout << "Invalid --timeout-ms\n";
        return false;
      }
    } else if (arg == "--tolerance") {
      std::string text;
      if (!requireValue(text) || !ParseDouble(text, options.tolerance)) {
        std::cout << "Invalid --tolerance\n";
        return false;
      }
    } else if (arg == "--fail-on-mismatch") {
      options.failOnMismatch = true;
    } else if (arg == "--fail-on-failed") {
      options.failOnFailed = true;
    } else {
      std::cout << "Unknown argument: " << arg << "\n";
      return false;
    }
  }

  if (options.inputDir.empty() || options.outputJsonPath.empty()) {
    std::cout << "--input-dir and --output-json are required\n";
    return false;
  }

  if (options.instanceId.empty() || options.sampleCount <= 0 || options.timeoutMs <= 0 ||
      options.tolerance <= 0.0) {
    std::cout << "Invalid numeric/input values\n";
    return false;
  }

  if (options.mode != "frequency" && options.mode != "time") {
    std::cout << "--mode must be frequency or time\n";
    return false;
  }

  return true;
}

std::string Trim(const std::string& text) {
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

std::string EscapeJson(const std::string& text) {
  std::ostringstream out;
  for (std::size_t i = 0; i < text.size(); ++i) {
    const char c = text[i];
    switch (c) {
      case '\\':
        out << "\\\\";
        break;
      case '"':
        out << "\\\"";
        break;
      case '\n':
        out << "\\n";
        break;
      case '\r':
        out << "\\r";
        break;
      case '\t':
        out << "\\t";
        break;
      default:
        out << c;
        break;
    }
  }
  return out.str();
}

std::vector<std::string> CollectJsonFiles(const std::string& inputDir) {
  std::vector<std::string> result;
  const std::filesystem::path rootPath(inputDir);
  if (!std::filesystem::exists(rootPath) || !std::filesystem::is_directory(rootPath)) {
    return result;
  }

  for (std::filesystem::recursive_directory_iterator it(rootPath), end; it != end; ++it) {
    if (!it->is_regular_file()) {
      continue;
    }

    const std::filesystem::path extension = it->path().extension();
    if (extension == ".json" || extension == ".JSON") {
      result.push_back(it->path().generic_string());
    }
  }

  std::sort(result.begin(), result.end());
  return result;
}

void FillCurrentRequest(vna::AcquisitionRequest* currentRequest, const Options& options) {
  currentRequest->set_instance_id(options.instanceId);
  currentRequest->set_sample_count(static_cast<std::uint32_t>(options.sampleCount));
  currentRequest->set_timeout_ms(static_cast<std::uint32_t>(options.timeoutMs));

  if (options.mode == "time") {
    currentRequest->mutable_excitation()->set_mode(vna::ExcitationMode::EXCITATION_MODE_PULSE);
    currentRequest->mutable_excitation()->mutable_pulse()->set_center_frequency_hz(1.0e9);
    currentRequest->mutable_excitation()->mutable_pulse()->set_pulse_width_ns(200);
    currentRequest->mutable_excitation()->mutable_pulse()->set_pulse_period_ns(2000);
    currentRequest->mutable_excitation()->mutable_pulse()->set_power_dbm(-10.0);
    currentRequest->mutable_excitation()->mutable_pulse()->set_rise_time_ns(20);
    return;
  }

  currentRequest->mutable_excitation()->set_mode(vna::ExcitationMode::EXCITATION_MODE_CW);
  currentRequest->mutable_excitation()->mutable_cw()->set_frequency_hz(1.0e9);
  currentRequest->mutable_excitation()->mutable_cw()->set_start_frequency_hz(1.0e9);
  currentRequest->mutable_excitation()->mutable_cw()->set_stop_frequency_hz(1.1e9);
  currentRequest->mutable_excitation()->mutable_cw()->set_sweep_point_count(3);
  currentRequest->mutable_excitation()->mutable_cw()->set_if_bandwidth_hz(1.0e3);
  currentRequest->mutable_excitation()->mutable_cw()->set_port_count(4);
  currentRequest->mutable_excitation()->mutable_cw()->set_excitation_port(2);
  currentRequest->mutable_excitation()->mutable_cw()->set_power_dbm(-10.0);
}

void SplitDetailAndToken(const std::string& detailInput,
                         std::string& detailOut,
                         std::string& tokenOut) {
  tokenOut.clear();
  detailOut = detailInput;

  const std::string tokenPrefix = "grpc_compare_token=";
  const std::size_t tokenPos = detailInput.find(tokenPrefix);
  if (tokenPos == std::string::npos) {
    return;
  }

  tokenOut = Trim(detailInput.substr(tokenPos));
  detailOut = Trim(detailInput.substr(0, tokenPos));
  if (!detailOut.empty() && detailOut[detailOut.size() - 1] == ',') {
    detailOut = Trim(detailOut.substr(0, detailOut.size() - 1));
  }
}

std::string BuildRequestId() {
  const std::uint64_t ticks = static_cast<std::uint64_t>(
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch())
          .count());
  std::ostringstream oss;
  oss << "batch-" << ticks;
  return oss.str();
}

std::string BuildUtcIso8601Now() {
  const std::time_t now = std::time(nullptr);
  std::tm tmUtc;
#if defined(_WIN32)
  gmtime_s(&tmUtc, &now);
#else
  gmtime_r(&now, &tmUtc);
#endif
  std::ostringstream oss;
  oss << std::put_time(&tmUtc, "%Y-%m-%dT%H:%M:%SZ");
  return oss.str();
}

bool WriteReportJson(const Options& options,
                     int total,
                     int matched,
                     int mismatched,
                     int failed,
                     const std::vector<CaseResult>& cases,
                     std::string& error) {
  const std::filesystem::path outputPath(options.outputJsonPath);
  const std::filesystem::path parentPath = outputPath.parent_path();
  if (!parentPath.empty()) {
    std::error_code ec;
    std::filesystem::create_directories(parentPath, ec);
    if (ec) {
      error = "create output directory failed: " + ec.message();
      return false;
    }
  }

  std::ofstream out(options.outputJsonPath.c_str(), std::ios::out | std::ios::trunc);
  if (!out.is_open()) {
    error = "cannot open output json path";
    return false;
  }

  out << "{\n";
  out << "  \"requestId\": \"" << EscapeJson(BuildRequestId()) << "\",\n";
  out << "  \"generatedAt\": \"" << EscapeJson(BuildUtcIso8601Now()) << "\",\n";
  out << "  \"instanceId\": \"" << EscapeJson(options.instanceId) << "\",\n";
  out << "  \"scanDir\": \"" << EscapeJson(options.inputDir) << "\",\n";
  out << "  \"mode\": \"" << EscapeJson(options.mode) << "\",\n";
  out << "  \"sampleCount\": " << options.sampleCount << ",\n";
  out << "  \"tolerance\": " << options.tolerance << ",\n";
  out << "  \"summary\": {\n";
  out << "    \"total\": " << total << ",\n";
  out << "    \"matched\": " << matched << ",\n";
  out << "    \"mismatched\": " << mismatched << ",\n";
  out << "    \"failed\": " << failed << "\n";
  out << "  },\n";
  out << "  \"cases\": [\n";

  for (std::size_t i = 0; i < cases.size(); ++i) {
    const CaseResult& item = cases[i];
    out << "    {\n";
    out << "      \"index\": " << item.index << ",\n";
    out << "      \"jsonPath\": \"" << EscapeJson(item.jsonPath) << "\",\n";
    out << "      \"status\": \"" << EscapeJson(item.status) << "\",\n";
    out << "      \"detail\": \"" << EscapeJson(item.detail) << "\",\n";
    out << "      \"grpcCompareToken\": \"" << EscapeJson(item.grpcCompareToken) << "\",\n";
    out << "      \"error\": \"" << EscapeJson(item.error) << "\"\n";
    out << "    }";
    if (i + 1 < cases.size()) {
      out << ",";
    }
    out << "\n";
  }

  out << "  ]\n";
  out << "}\n";
  out.close();
  return true;
}

}  // namespace

int main(int argc, char** argv) {
  Options options;
  if (!ParseArgs(argc, argv, options)) {
    PrintUsage();
    return 2;
  }

  const std::vector<std::string> jsonPaths = CollectJsonFiles(options.inputDir);
  if (jsonPaths.empty()) {
    std::cout << "No json files found under input directory: " << options.inputDir << "\n";
    return 3;
  }

  std::shared_ptr<grpc::Channel> channel =
      grpc::CreateChannel(options.endpoint, grpc::InsecureChannelCredentials());
  std::unique_ptr<vna::VnaControl::Stub> stub = vna::VnaControl::NewStub(channel);

  int matchedCount = 0;
  int mismatchedCount = 0;
  int failedCount = 0;
  std::vector<CaseResult> caseResults;
  caseResults.reserve(jsonPaths.size());

  for (std::size_t i = 0; i < jsonPaths.size(); ++i) {
    CaseResult item;
    item.index = static_cast<int>(i + 1);
    item.jsonPath = jsonPaths[i];

    grpc::ClientContext context;
    vna::CompareImportedAcquisitionRequest request;
    vna::CompareImportedAcquisitionResponse response;

    request.set_json_path(jsonPaths[i]);
    request.set_tolerance(options.tolerance);
    FillCurrentRequest(request.mutable_current_request(), options);

    const grpc::Status rpcStatus = stub->CompareImportedAcquisition(&context, request, &response);
    if (!rpcStatus.ok()) {
      item.status = "failed";
      std::ostringstream err;
      err << "grpc_error code=" << rpcStatus.error_code() << " message=" << rpcStatus.error_message();
      item.error = err.str();
      ++failedCount;
      caseResults.push_back(item);
      continue;
    }

    std::string detail;
    std::string token;
    SplitDetailAndToken(response.detail(), detail, token);
    item.detail = detail;
    item.grpcCompareToken = token;

    if (response.matched()) {
      item.status = "matched";
      ++matchedCount;
    } else {
      item.status = "mismatched";
      ++mismatchedCount;
    }

    caseResults.push_back(item);
  }

  std::string writeError;
  if (!WriteReportJson(options,
                       static_cast<int>(jsonPaths.size()),
                       matchedCount,
                       mismatchedCount,
                       failedCount,
                       caseResults,
                       writeError)) {
    std::cout << "Write report failed: " << writeError << "\n";
    return 4;
  }

  std::cout << "batch compare done"
            << " total=" << jsonPaths.size()
            << " matched=" << matchedCount
            << " mismatched=" << mismatchedCount
            << " failed=" << failedCount
            << " output=" << options.outputJsonPath << "\n";

  if (options.failOnMismatch && mismatchedCount > 0) {
    return 5;
  }
  if (options.failOnFailed && failedCount > 0) {
    return 6;
  }

  return 0;
}
