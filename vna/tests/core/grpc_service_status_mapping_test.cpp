#include <cassert>

#include <grpcpp/grpcpp.h>

#include "core/built_in_drivers.h"
#include "service/grpc/vna_control_grpc_service.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::service::VnaControlService controlService;

  vna::core::Topology topology;
  topology.id = "grpc_caps";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n";
  assert(controlService.ApplyTopology(topology, "ws-grpc", 2) == vna::core::Status::kOk);

  vna::service::ServiceStatusService statusService;
  vna::service::VnaControlInProcessHandler inprocHandler;
  vna::service::ResourceBrokerService brokerService;

  vna::service::ServiceConfig config;
  config.bindAddress = "127.0.0.1";
  config.port = 53000;
  config.tlsEnabled = false;
  config.logLevel = "info";
  statusService.UpdateConfig(config);

  vna::service::HealthStatus health;
  health.ready = true;
  health.state = "ready";
  health.message = "grpc bootstrap";
  health.uptimeMs = 777;
  statusService.UpdateHealth(health);

  statusService.UpdateBootstrapContext("grpc", "config/service.yaml");
  statusService.UpdateRuntimeMetrics(4, 2);

  vna::service::VnaControlGrpcService grpcService(
      &controlService,
      &statusService,
      &inprocHandler,
      4,
      10,
      &brokerService);

    vna::service::LockAcquireRequest lockReq;
    lockReq.selector.type = vna::service::LockResourceType::kPhysicalDevice;
    lockReq.selector.resourceId = "dev0";
    lockReq.owner.workspaceId = "ws-lock-holder";
    lockReq.owner.actor = "grpc-test";
    lockReq.mode = vna::service::LockMode::kExclusive;
    lockReq.ttlSeconds = 60;
    lockReq.waitTimeoutMs = 0;

    vna::service::LockAcquireResult lockResult;
    assert(brokerService.AcquireLock(lockReq, lockResult) == vna::core::Status::kOk);
    assert(lockResult.status == vna::core::Status::kOk);

    vna::TopologyPrecheckRequest precheckReq;
    precheckReq.set_workspace_id("ws-a");
    precheckReq.mutable_topology()->set_id("topo-a");
    precheckReq.mutable_topology()->set_yaml(
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n");
    precheckReq.set_activate(true);
    precheckReq.set_destructive_change(false);
    precheckReq.add_required_resources()->set_type(vna::LockResourceType::LOCK_RESOURCE_TYPE_PHYSICAL_DEVICE);
    precheckReq.mutable_required_resources(0)->set_resource_id("dev0");

    vna::TopologyPrecheckResult precheckResp;
    grpc::Status precheckStatus = grpcService.PrecheckWorkspaceTopology(nullptr, &precheckReq, &precheckResp);
    assert(precheckStatus.ok());
    assert(!precheckResp.ok());
    assert(precheckResp.code() == "LOCK_CONFLICT");
    assert(precheckResp.lock_conflicts_size() > 0);
    assert(precheckResp.lock_conflicts(0).selector().resource_id() == "dev0");
    assert(precheckResp.lock_conflicts(0).holder_owner().workspace_id() == "ws-lock-holder");

    vna::WorkspaceTopologyUpsertRequest upsertReqA;
    upsertReqA.set_workspace_id("ws-a");
    upsertReqA.mutable_topology()->set_id("topo-a");
    upsertReqA.mutable_topology()->set_yaml(
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n");
    upsertReqA.set_activate(true);
    vna::ValidationResult upsertRespA;
    grpc::Status upsertStatusA = grpcService.UpsertWorkspaceTopology(nullptr, &upsertReqA, &upsertRespA);
    assert(upsertStatusA.ok());
    assert(upsertRespA.ok());

    vna::WorkspaceTopologyUpsertRequest upsertReqB;
    upsertReqB.set_workspace_id("ws-b");
    upsertReqB.mutable_topology()->set_id("topo-b");
    upsertReqB.mutable_topology()->set_yaml(
      "instances:\n"
      "  - id: inst1\n"
      "    driver: usb\n"
      "    device: usb-mock-1\n"
      "    resource: dev1\n");
    upsertReqB.set_activate(false);
    vna::ValidationResult upsertRespB;
    grpc::Status upsertStatusB = grpcService.UpsertWorkspaceTopology(nullptr, &upsertReqB, &upsertRespB);
    assert(upsertStatusB.ok());
    assert(upsertRespB.ok());

    vna::WorkspaceRef getReq;
    getReq.set_workspace_id("ws-a");
    vna::WorkspaceTopologyConfig getResp;
    grpc::Status getWorkspaceStatus = grpcService.GetWorkspaceTopology(nullptr, &getReq, &getResp);
    assert(getWorkspaceStatus.ok());
    assert(getResp.workspace_id() == "ws-a");
    assert(getResp.topology().id() == "topo-a");
    assert(getResp.is_active());

    vna::WorkspaceTopologyList listResp;
    grpc::Status listStatus = grpcService.ListWorkspaceTopologies(nullptr, nullptr, &listResp);
    assert(listStatus.ok());
    assert(listResp.items_size() >= 2);
    bool hasWorkspaceA = false;
    bool hasWorkspaceB = false;
    for (int i = 0; i < listResp.items_size(); ++i) {
      hasWorkspaceA = hasWorkspaceA || listResp.items(i).workspace_id() == "ws-a";
      hasWorkspaceB = hasWorkspaceB || listResp.items(i).workspace_id() == "ws-b";
    }
    assert(hasWorkspaceA);
    assert(hasWorkspaceB);
    assert(listResp.active_workspace_id() == "ws-a");

    vna::WorkspaceRef activateReq;
    activateReq.set_workspace_id("ws-b");
    vna::ValidationResult activateResp;
    grpc::Status activateStatus = grpcService.SetActiveWorkspace(nullptr, &activateReq, &activateResp);
    assert(activateStatus.ok());
    assert(activateResp.ok());

    vna::WorkspaceTopologyList listRespAfterActivate;
    grpc::Status listAfterActivateStatus =
      grpcService.ListWorkspaceTopologies(nullptr, nullptr, &listRespAfterActivate);
    assert(listAfterActivateStatus.ok());
    assert(listRespAfterActivate.active_workspace_id() == "ws-b");

  vna::ScanStateRequest setHold;
  setHold.set_instance_id("inst0");
  setHold.set_desired_state(vna::ScanState::SCAN_STATE_HOLD);
  vna::ScanStateResponse setHoldResp;
  grpc::Status setHoldStatus = grpcService.SetScanState(nullptr, &setHold, &setHoldResp);
  assert(setHoldStatus.ok());
  assert(setHoldResp.state() == vna::ScanState::SCAN_STATE_HOLD);
  assert(!setHoldResp.stream_active());

  vna::InstanceSelector stateReq;
  stateReq.set_instance_id("inst0");
  vna::ScanStateResponse stateResp;
  grpc::Status getStateStatus = grpcService.GetScanState(nullptr, &stateReq, &stateResp);
  assert(getStateStatus.ok());
  assert(stateResp.state() == vna::ScanState::SCAN_STATE_HOLD);

  vna::ScanStateRequest setContinuous;
  setContinuous.set_instance_id("inst0");
  setContinuous.set_desired_state(vna::ScanState::SCAN_STATE_CONTINUOUS);
  vna::ScanStateResponse setContinuousResp;
  grpc::Status setContinuousStatus = grpcService.SetScanState(nullptr, &setContinuous, &setContinuousResp);
  assert(setContinuousStatus.ok());
  assert(setContinuousResp.state() == vna::ScanState::SCAN_STATE_CONTINUOUS);
  assert(setContinuousResp.stream_active());

    vna::InstanceSelector capsRequest;
    capsRequest.set_instance_id("inst0");
    vna::InstanceCapabilities capsResponse;
    grpc::Status capsStatus = grpcService.GetInstanceCapabilities(nullptr, &capsRequest, &capsResponse);
    assert(capsStatus.ok());
    assert(capsResponse.supports_pulse_excitation());
    assert(capsResponse.supports_multi_tone());
    assert(capsResponse.supports_external_clock());
    assert(capsResponse.min_pulse_width_ns() > 0);
    assert(capsResponse.max_sampling_rate_ghz() > 0.0);

    vna::InstanceSelector missingRequest;
    missingRequest.set_instance_id("missing-inst");
    grpc::Status missingStatus = grpcService.GetInstanceCapabilities(nullptr, &missingRequest, &capsResponse);
    assert(!missingStatus.ok());
    assert(missingStatus.error_code() == grpc::StatusCode::INVALID_ARGUMENT);

  vna::Empty request;
  vna::ServiceStatus response;
  grpc::Status rpcStatus = grpcService.GetServiceStatus(nullptr, &request, &response);

  assert(rpcStatus.ok());
  assert(response.ready());
  assert(response.state() == "ready");
  assert(response.message() == "grpc bootstrap | config=config/service.yaml");
  assert(response.bootstrap_mode() == "grpc");
  assert(response.config_path() == "config/service.yaml");
  assert(response.uptime_ms() == 777);
  assert(response.bind_address() == "127.0.0.1");
  assert(response.port() == 53000);
  assert(!response.tls_enabled());
  assert(response.log_level() == "info");
  assert(response.instance_count() == 4);
  assert(response.active_lease_count() == 2);

  return 0;
}
