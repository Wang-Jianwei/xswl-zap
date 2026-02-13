#pragma once

#include <string>

#include "core/measurement_data.h"
#include "core/status.h"

namespace vna {
namespace core {

class MeasurementExporter {
 public:
  static Status ExportCsv(const AcquisitionResult& result, const std::string& outputPath);
  static Status ExportTouchstone(const AcquisitionResult& result, const std::string& outputPath);
};

}  // namespace core
}  // namespace vna
