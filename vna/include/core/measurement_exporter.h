#pragma once

#include <string>

#include "core/measurement_data.h"
#include "core/status.h"

namespace vna {
namespace core {

class MeasurementExporter {
 public:
  static Status ExportCsv(const AcquisitionResult& result,
                          const std::string& outputPath,
                          std::string* errorMessage = nullptr);
    static Status ExportJson(const AcquisitionResult& result,
                                                     const std::string& outputPath,
                                                     std::string* errorMessage = nullptr);
    static Status ImportJson(const std::string& inputPath,
                                                     AcquisitionResult& out,
                                                     std::string* errorMessage = nullptr);
  static Status ExportTouchstone(const AcquisitionResult& result,
                                 const std::string& outputPath,
                                 std::string* errorMessage = nullptr);
};

}  // namespace core
}  // namespace vna
