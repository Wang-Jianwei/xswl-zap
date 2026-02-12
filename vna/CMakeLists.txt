cmake_minimum_required(VERSION 3.10)

project(xswl_zap_vna LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(XSWL_BUILD_MOCK_SERVER "Build mock backend server" ON)
option(XSWL_BUILD_TESTS "Build minimal core tests" ON)
option(XSWL_ENABLE_PROTO_GENERATION "Enable proto C++/gRPC C++ code generation target" OFF)

# Environment constraint (2026-02): built executables must start with "easy" to be runnable.
# Therefore all add_executable() targets in this subproject set OUTPUT_NAME to an easy_* name.

add_library(vna_contract INTERFACE)
target_include_directories(vna_contract INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_library(vna_core_bootstrap STATIC
    src/core/built_in_drivers.cpp
    src/core/hardware_driver_factory.cpp
    src/core/hardware_coordinator.cpp
    src/core/instance_manager.cpp
    src/core/measurement_pipeline.cpp
    src/core/plugin_manager.cpp
    src/core/plugin_registry.cpp
    src/core/resource_manager.cpp
    src/core/topology_manager.cpp
    src/core/topology_parser.cpp
    src/core/vna_runtime.cpp
    src/core/trigger_chain_validator.cpp
    src/core/processors/time_domain_processor.cpp
    src/drivers/pxi_driver.cpp
    src/drivers/usb_vna_driver.cpp
)
target_link_libraries(vna_core_bootstrap PUBLIC vna_contract)
target_include_directories(vna_core_bootstrap PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_library(vna_service_bootstrap STATIC
    src/service/vna_control_service.cpp
)
target_link_libraries(vna_service_bootstrap PUBLIC vna_core_bootstrap)
target_include_directories(vna_service_bootstrap PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

if(XSWL_ENABLE_PROTO_GENERATION)
    find_program(XSWL_PROTOC_EXECUTABLE protoc)
    find_program(XSWL_GRPC_CPP_PLUGIN_EXECUTABLE grpc_cpp_plugin)
    if(WIN32)
        set(XSWL_TS_PROTO_PLUGIN_EXECUTABLE "$ENV{APPDATA}/npm/protoc-gen-ts_proto.cmd")
        if(NOT EXISTS "${XSWL_TS_PROTO_PLUGIN_EXECUTABLE}")
            find_program(XSWL_TS_PROTO_PLUGIN_EXECUTABLE
                NAMES protoc-gen-ts_proto.cmd
                HINTS "$ENV{APPDATA}/npm"
            )
        endif()
    else()
        find_program(XSWL_TS_PROTO_PLUGIN_EXECUTABLE
            NAMES protoc-gen-ts_proto
        )
    endif()

    if(NOT XSWL_PROTOC_EXECUTABLE)
        message(FATAL_ERROR "XSWL_ENABLE_PROTO_GENERATION=ON but protoc was not found in PATH")
    endif()
    if(NOT XSWL_GRPC_CPP_PLUGIN_EXECUTABLE)
        message(FATAL_ERROR "XSWL_ENABLE_PROTO_GENERATION=ON but grpc_cpp_plugin was not found in PATH")
    endif()
    if(NOT XSWL_TS_PROTO_PLUGIN_EXECUTABLE)
        message(FATAL_ERROR "XSWL_ENABLE_PROTO_GENERATION=ON but protoc-gen-ts_proto was not found in PATH or %APPDATA%/npm")
    endif()

    add_custom_target(vna_generate_proto
        COMMAND ${CMAKE_COMMAND} -E env
            "PATH=$ENV{PATH}"
            powershell -ExecutionPolicy Bypass -File ${CMAKE_CURRENT_SOURCE_DIR}/scripts/generate_proto.ps1
                -ProtoFile vna.proto
                -ProtoDir ${CMAKE_CURRENT_SOURCE_DIR}/proto
                -OutDir ${CMAKE_CURRENT_SOURCE_DIR}/generated/cpp
                -TsOutDir ${CMAKE_CURRENT_SOURCE_DIR}/generated/ts
                -ProtocPath ${XSWL_PROTOC_EXECUTABLE}
                -GrpcPluginPath ${XSWL_GRPC_CPP_PLUGIN_EXECUTABLE}
                -TsPluginPath ${XSWL_TS_PROTO_PLUGIN_EXECUTABLE}
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
            COMMENT "Generating C++/gRPC C++/TS stubs from proto/vna.proto"
    )
endif()

if(XSWL_BUILD_MOCK_SERVER)
    add_executable(vna_mock_server
        src/service/mock_server.cpp
    )
    target_link_libraries(vna_mock_server PRIVATE vna_service_bootstrap)
    set_target_properties(vna_mock_server PROPERTIES OUTPUT_NAME "easy_mock_server")
endif()
if(XSWL_BUILD_TESTS)
    enable_testing()

    add_executable(vna_time_domain_processor_test
        tests/core/time_domain_processor_test.cpp
    )
    target_link_libraries(vna_time_domain_processor_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_time_domain_processor_test PROPERTIES OUTPUT_NAME "easy_time_domain_processor_test")

    add_executable(vna_trigger_chain_validator_test
        tests/core/trigger_chain_validator_test.cpp
    )
    target_link_libraries(vna_trigger_chain_validator_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_trigger_chain_validator_test PROPERTIES OUTPUT_NAME "easy_trigger_chain_validator_test")

    add_executable(vna_hardware_driver_factory_test
        tests/core/hardware_driver_factory_test.cpp
    )
    target_link_libraries(vna_hardware_driver_factory_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_hardware_driver_factory_test PROPERTIES OUTPUT_NAME "easy_hardware_driver_factory_test")

    add_executable(vna_measurement_pipeline_test
        tests/core/measurement_pipeline_test.cpp
    )
    target_link_libraries(vna_measurement_pipeline_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_measurement_pipeline_test PROPERTIES OUTPUT_NAME "easy_measurement_pipeline_test")

    add_executable(vna_topology_manager_test
        tests/core/topology_manager_test.cpp
    )
    target_link_libraries(vna_topology_manager_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_topology_manager_test PROPERTIES OUTPUT_NAME "easy_topology_manager_test")

    add_executable(vna_resource_manager_test
        tests/core/resource_manager_test.cpp
    )
    target_link_libraries(vna_resource_manager_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_resource_manager_test PROPERTIES OUTPUT_NAME "easy_resource_manager_test")

    add_executable(vna_plugin_manager_test
        tests/core/plugin_manager_test.cpp
    )
    target_link_libraries(vna_plugin_manager_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_plugin_manager_test PROPERTIES OUTPUT_NAME "easy_plugin_manager_test")

    add_executable(vna_plugin_lifecycle_test
        tests/core/plugin_lifecycle_test.cpp
    )
    target_link_libraries(vna_plugin_lifecycle_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_plugin_lifecycle_test PROPERTIES OUTPUT_NAME "easy_plugin_lifecycle_test")

    add_executable(vna_instance_manager_test
        tests/core/instance_manager_test.cpp
    )
    target_link_libraries(vna_instance_manager_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_instance_manager_test PROPERTIES OUTPUT_NAME "easy_instance_manager_test")

    add_executable(vna_instance_manager_from_topology_test
        tests/core/instance_manager_from_topology_test.cpp
    )
    target_link_libraries(vna_instance_manager_from_topology_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_instance_manager_from_topology_test PROPERTIES OUTPUT_NAME "easy_instance_manager_from_topology_test")

    add_executable(vna_vna_runtime_test
        tests/core/vna_runtime_test.cpp
    )
    target_link_libraries(vna_vna_runtime_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_vna_runtime_test PROPERTIES OUTPUT_NAME "easy_vna_runtime_test")

    add_executable(vna_vna_control_service_test
        tests/core/vna_control_service_test.cpp
    )
    target_link_libraries(vna_vna_control_service_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_vna_control_service_test PROPERTIES OUTPUT_NAME "easy_vna_control_service_test")

    add_test(NAME vna_time_domain_processor_test COMMAND $<TARGET_FILE:vna_time_domain_processor_test>)
    add_test(NAME vna_trigger_chain_validator_test COMMAND $<TARGET_FILE:vna_trigger_chain_validator_test>)
    add_test(NAME vna_hardware_driver_factory_test COMMAND $<TARGET_FILE:vna_hardware_driver_factory_test>)
    add_test(NAME vna_measurement_pipeline_test COMMAND $<TARGET_FILE:vna_measurement_pipeline_test>)
    add_test(NAME vna_topology_manager_test COMMAND $<TARGET_FILE:vna_topology_manager_test>)
    add_test(NAME vna_resource_manager_test COMMAND $<TARGET_FILE:vna_resource_manager_test>)
    add_test(NAME vna_plugin_manager_test COMMAND $<TARGET_FILE:vna_plugin_manager_test>)
    add_test(NAME vna_plugin_lifecycle_test COMMAND $<TARGET_FILE:vna_plugin_lifecycle_test>)
    add_test(NAME vna_instance_manager_test COMMAND $<TARGET_FILE:vna_instance_manager_test>)
    add_test(NAME vna_instance_manager_from_topology_test COMMAND $<TARGET_FILE:vna_instance_manager_from_topology_test>)
    add_test(NAME vna_vna_runtime_test COMMAND $<TARGET_FILE:vna_vna_runtime_test>)
    add_test(NAME vna_vna_control_service_test COMMAND $<TARGET_FILE:vna_vna_control_service_test>)
endif()
