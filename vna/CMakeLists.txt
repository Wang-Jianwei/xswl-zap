cmake_minimum_required(VERSION 3.10)

project(xswl_zap_vna LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(XSWL_BUILD_MOCK_SERVER "Build mock backend server" ON)
option(XSWL_BUILD_TESTS "Build minimal core tests" ON)
option(XSWL_ENABLE_PROTO_GENERATION "Enable proto C++/gRPC C++ code generation target" OFF)
option(XSWL_ENABLE_GRPC_CPP_ADAPTER "Enable gRPC C++ adapter compilation (requires grpc/protobuf headers and libs)" OFF)

# Environment constraint (2026-02): built executables must start with "easy" to be runnable.
# Therefore all add_executable() targets in this subproject set OUTPUT_NAME to an easy_* name.

add_library(vna_contract INTERFACE)
target_include_directories(vna_contract INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_library(vna_core_bootstrap STATIC
    src/core/acquisition_comparator.cpp
    src/core/built_in_drivers.cpp
    src/core/hardware_driver_factory.cpp
    src/core/hardware_coordinator.cpp
    src/core/instance_manager.cpp
    src/core/measurement_exporter.cpp
    src/core/measurement_pipeline.cpp
    src/core/plugin_manager.cpp
    src/core/plugin_registry.cpp
    src/core/resource_manager.cpp
    src/core/s_parameter_math.cpp
    src/core/topology_manager.cpp
    src/core/topology_parser.cpp
    src/core/vna_runtime.cpp
    src/core/trigger_chain_validator.cpp
    src/core/processors/de_embedding_processor.cpp
    src/core/processors/time_domain_processor.cpp
    src/drivers/pxi_driver.cpp
    src/drivers/usb_vna_driver.cpp
)
target_link_libraries(vna_core_bootstrap PUBLIC vna_contract)
target_include_directories(vna_core_bootstrap PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_library(vna_service_bootstrap STATIC
    src/service/de_embedding_config_parser.cpp
    src/service/process_manager.cpp
    src/service/resource_broker_service.cpp
    src/service/service_config.cpp
    src/service/service_status_service.cpp
    src/service/vna_control_inproc_handler.cpp
    src/service/vna_control_service.cpp
)
target_link_libraries(vna_service_bootstrap PUBLIC vna_core_bootstrap)
target_include_directories(vna_service_bootstrap PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

if(XSWL_ENABLE_GRPC_CPP_ADAPTER)
    find_program(XSWL_PKG_CONFIG_EXECUTABLE
        NAMES pkg-config pkgconf
        HINTS C:/msys64/mingw64/bin
    )
    if(NOT XSWL_PKG_CONFIG_EXECUTABLE)
        message(FATAL_ERROR "XSWL_ENABLE_GRPC_CPP_ADAPTER=ON but pkg-config was not found (expected in C:/msys64/mingw64/bin)")
    endif()

    execute_process(
        COMMAND ${XSWL_PKG_CONFIG_EXECUTABLE} --libs grpc++
        OUTPUT_VARIABLE XSWL_GRPCPP_LIBS_RAW
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    execute_process(
        COMMAND ${XSWL_PKG_CONFIG_EXECUTABLE} --libs protobuf
        OUTPUT_VARIABLE XSWL_PROTOBUF_LIBS_RAW
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    separate_arguments(XSWL_GRPCPP_LIBS_LIST NATIVE_COMMAND ${XSWL_GRPCPP_LIBS_RAW})
    separate_arguments(XSWL_PROTOBUF_LIBS_LIST NATIVE_COMMAND ${XSWL_PROTOBUF_LIBS_RAW})

    add_library(vna_grpc_proto_contract STATIC
        generated/cpp/vna.pb.cc
        generated/cpp/vna.grpc.pb.cc
    )
    set_target_properties(vna_grpc_proto_contract PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_include_directories(vna_grpc_proto_contract PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_SOURCE_DIR}/generated/cpp
        C:/msys64/mingw64/include
    )
    target_compile_definitions(vna_grpc_proto_contract PUBLIC
        _WIN32_WINNT=0x0600
    )
    target_link_directories(vna_grpc_proto_contract PUBLIC
        C:/msys64/mingw64/lib
    )
    target_link_libraries(vna_grpc_proto_contract PUBLIC
        ${XSWL_GRPCPP_LIBS_LIST}
        ${XSWL_PROTOBUF_LIBS_LIST}
    )

    add_library(vna_grpc_service_adapter STATIC
        src/service/grpc/vna_control_grpc_service.cpp
    )
    set_target_properties(vna_grpc_service_adapter PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_include_directories(vna_grpc_service_adapter PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_SOURCE_DIR}/generated/cpp
        C:/msys64/mingw64/include
    )
    target_compile_definitions(vna_grpc_service_adapter PUBLIC
        _WIN32_WINNT=0x0600
    )
    target_link_directories(vna_grpc_service_adapter PUBLIC
        C:/msys64/mingw64/lib
    )
    target_link_libraries(vna_grpc_service_adapter PUBLIC
        vna_service_bootstrap
        vna_grpc_proto_contract
    )

    add_executable(vna_grpc_server
        src/service/grpc/grpc_server_main.cpp
        src/service/grpc/grpc_bootstrap_paths.cpp
    )
    set_target_properties(vna_grpc_server PROPERTIES
        OUTPUT_NAME "easy_grpc_server"
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_link_libraries(vna_grpc_server PRIVATE vna_grpc_service_adapter)

    add_executable(vna_grpc_client_smoke
        src/service/grpc/grpc_client_smoke_main.cpp
    )
    set_target_properties(vna_grpc_client_smoke PROPERTIES
        OUTPUT_NAME "easy_grpc_client_smoke"
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_link_libraries(vna_grpc_client_smoke PRIVATE vna_grpc_proto_contract)

    add_executable(vna_grpc_stream_smoke
        src/service/grpc/grpc_stream_smoke_main.cpp
    )
    set_target_properties(vna_grpc_stream_smoke PROPERTIES
        OUTPUT_NAME "easy_grpc_stream_smoke"
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_link_libraries(vna_grpc_stream_smoke PRIVATE vna_grpc_proto_contract)

    add_executable(vna_grpc_batch_compare
        src/service/grpc/grpc_batch_compare_main.cpp
    )
    set_target_properties(vna_grpc_batch_compare PROPERTIES
        OUTPUT_NAME "easy_grpc_batch_compare"
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_link_libraries(vna_grpc_batch_compare PRIVATE vna_grpc_proto_contract)

    add_executable(vna_grpc_service_status_mapping_test
        tests/core/grpc_service_status_mapping_test.cpp
    )
    set_target_properties(vna_grpc_service_status_mapping_test PROPERTIES
        OUTPUT_NAME "easy_grpc_service_status_mapping_test"
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        CXX_EXTENSIONS OFF
    )
    target_link_libraries(vna_grpc_service_status_mapping_test PRIVATE vna_grpc_service_adapter)
endif()

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

    add_executable(vna_de_embedding_processor_test
        tests/core/de_embedding_processor_test.cpp
    )
    target_link_libraries(vna_de_embedding_processor_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_de_embedding_processor_test PROPERTIES OUTPUT_NAME "easy_de_embedding_processor_test")

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

    add_executable(vna_pxi_driver_test
        tests/core/pxi_driver_test.cpp
    )
    target_link_libraries(vna_pxi_driver_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_pxi_driver_test PROPERTIES OUTPUT_NAME "easy_pxi_driver_test")

    add_executable(vna_usb_vna_driver_test
        tests/core/usb_vna_driver_test.cpp
    )
    target_link_libraries(vna_usb_vna_driver_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_usb_vna_driver_test PROPERTIES OUTPUT_NAME "easy_usb_vna_driver_test")

    add_executable(vna_grpc_bootstrap_paths_test
        tests/core/grpc_bootstrap_paths_test.cpp
        src/service/grpc/grpc_bootstrap_paths.cpp
    )
    target_link_libraries(vna_grpc_bootstrap_paths_test PRIVATE vna_contract)
    set_target_properties(vna_grpc_bootstrap_paths_test PROPERTIES OUTPUT_NAME "easy_grpc_bootstrap_paths_test")

    add_executable(vna_measurement_pipeline_test
        tests/core/measurement_pipeline_test.cpp
    )
    target_link_libraries(vna_measurement_pipeline_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_measurement_pipeline_test PROPERTIES OUTPUT_NAME "easy_measurement_pipeline_test")

    add_executable(vna_measurement_exporter_test
        tests/core/measurement_exporter_test.cpp
    )
    target_link_libraries(vna_measurement_exporter_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_measurement_exporter_test PROPERTIES OUTPUT_NAME "easy_measurement_exporter_test")

    add_executable(vna_acquisition_comparator_test
        tests/core/acquisition_comparator_test.cpp
    )
    target_link_libraries(vna_acquisition_comparator_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_acquisition_comparator_test PROPERTIES OUTPUT_NAME "easy_acquisition_comparator_test")

    add_executable(vna_s_parameter_math_test
        tests/core/s_parameter_math_test.cpp
    )
    target_link_libraries(vna_s_parameter_math_test PRIVATE vna_core_bootstrap)
    set_target_properties(vna_s_parameter_math_test PROPERTIES OUTPUT_NAME "easy_s_parameter_math_test")

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

    add_executable(vna_resource_broker_service_test
        tests/core/resource_broker_service_test.cpp
    )
    target_link_libraries(vna_resource_broker_service_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_resource_broker_service_test PROPERTIES OUTPUT_NAME "easy_resource_broker_service_test")

    add_executable(vna_process_manager_test
        tests/core/process_manager_test.cpp
    )
    target_link_libraries(vna_process_manager_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_process_manager_test PROPERTIES OUTPUT_NAME "easy_process_manager_test")

    add_executable(vna_service_config_test
        tests/core/service_config_test.cpp
    )
    target_link_libraries(vna_service_config_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_service_config_test PROPERTIES OUTPUT_NAME "easy_service_config_test")

    add_executable(vna_de_embedding_config_parser_test
        tests/core/de_embedding_config_parser_test.cpp
    )
    target_link_libraries(vna_de_embedding_config_parser_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_de_embedding_config_parser_test PROPERTIES OUTPUT_NAME "easy_de_embedding_config_parser_test")

    add_executable(vna_service_flow_integration_test
        tests/integration/service_flow_integration_test.cpp
    )
    target_link_libraries(vna_service_flow_integration_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_service_flow_integration_test PROPERTIES OUTPUT_NAME "easy_service_flow_integration_test")

    add_executable(vna_multi_instance_parallel_integration_test
        tests/integration/multi_instance_parallel_integration_test.cpp
    )
    target_link_libraries(vna_multi_instance_parallel_integration_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_multi_instance_parallel_integration_test PROPERTIES OUTPUT_NAME "easy_multi_instance_parallel_integration_test")

    add_executable(vna_service_status_service_test
        tests/core/service_status_service_test.cpp
    )
    target_link_libraries(vna_service_status_service_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_service_status_service_test PROPERTIES OUTPUT_NAME "easy_service_status_service_test")

    add_executable(vna_service_status_concurrency_test
        tests/core/service_status_concurrency_test.cpp
    )
    target_link_libraries(vna_service_status_concurrency_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_service_status_concurrency_test PROPERTIES OUTPUT_NAME "easy_service_status_concurrency_test")

    add_executable(vna_vna_control_inproc_handler_test
        tests/core/vna_control_inproc_handler_test.cpp
    )
    target_link_libraries(vna_vna_control_inproc_handler_test PRIVATE vna_service_bootstrap)
    set_target_properties(vna_vna_control_inproc_handler_test PROPERTIES OUTPUT_NAME "easy_vna_control_inproc_handler_test")

    add_test(NAME vna_time_domain_processor_test COMMAND $<TARGET_FILE:vna_time_domain_processor_test>)
    add_test(NAME vna_trigger_chain_validator_test COMMAND $<TARGET_FILE:vna_trigger_chain_validator_test>)
    add_test(NAME vna_hardware_driver_factory_test COMMAND $<TARGET_FILE:vna_hardware_driver_factory_test>)
    add_test(NAME vna_pxi_driver_test COMMAND $<TARGET_FILE:vna_pxi_driver_test>)
    add_test(NAME vna_usb_vna_driver_test COMMAND $<TARGET_FILE:vna_usb_vna_driver_test>)
    add_test(NAME vna_grpc_bootstrap_paths_test COMMAND $<TARGET_FILE:vna_grpc_bootstrap_paths_test>)
    add_test(NAME vna_measurement_pipeline_test COMMAND $<TARGET_FILE:vna_measurement_pipeline_test>)
    add_test(NAME vna_acquisition_comparator_test COMMAND $<TARGET_FILE:vna_acquisition_comparator_test>)
    add_test(NAME vna_topology_manager_test COMMAND $<TARGET_FILE:vna_topology_manager_test>)
    add_test(NAME vna_resource_manager_test COMMAND $<TARGET_FILE:vna_resource_manager_test>)
    add_test(NAME vna_plugin_manager_test COMMAND $<TARGET_FILE:vna_plugin_manager_test>)
    add_test(NAME vna_plugin_lifecycle_test COMMAND $<TARGET_FILE:vna_plugin_lifecycle_test>)
    add_test(NAME vna_instance_manager_test COMMAND $<TARGET_FILE:vna_instance_manager_test>)
    add_test(NAME vna_instance_manager_from_topology_test COMMAND $<TARGET_FILE:vna_instance_manager_from_topology_test>)
    add_test(NAME vna_vna_runtime_test COMMAND $<TARGET_FILE:vna_vna_runtime_test>)
    add_test(NAME vna_vna_control_service_test COMMAND $<TARGET_FILE:vna_vna_control_service_test>)
    add_test(NAME vna_resource_broker_service_test COMMAND $<TARGET_FILE:vna_resource_broker_service_test>)
    add_test(NAME vna_process_manager_test COMMAND $<TARGET_FILE:vna_process_manager_test>)
    add_test(NAME vna_service_config_test COMMAND $<TARGET_FILE:vna_service_config_test>)
    add_test(NAME vna_de_embedding_config_parser_test COMMAND $<TARGET_FILE:vna_de_embedding_config_parser_test>)
    add_test(NAME vna_service_flow_integration_test COMMAND $<TARGET_FILE:vna_service_flow_integration_test>)
    add_test(NAME vna_service_status_service_test COMMAND $<TARGET_FILE:vna_service_status_service_test>)
    add_test(NAME vna_service_status_concurrency_test COMMAND $<TARGET_FILE:vna_service_status_concurrency_test>)
    add_test(NAME vna_vna_control_inproc_handler_test COMMAND $<TARGET_FILE:vna_vna_control_inproc_handler_test>)
endif()
