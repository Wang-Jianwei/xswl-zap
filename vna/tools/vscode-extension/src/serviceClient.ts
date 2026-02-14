import * as path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type {
  AcquisitionSummary,
  ServiceStatus,
  StreamPreviewFrame,
  StreamPreviewSummary,
  ValidationResult,
  TopologyErrorDetail,
  WaveformMode,
  WaveformPreviewData,
  WaveformTraceSource,
} from "./types";
import { buildWaveformPreviewData } from "./waveformPreview";

const kDefaultCwCenterFrequencyHz = 1.0e9;
const kDefaultCwSpanHz = 1.0e8;

export function buildCwExcitationFromSampleCount(sampleCount: number): Record<string, number> {
  const normalizedSampleCount = Number.isFinite(sampleCount)
    ? Math.max(2, Math.min(4096, Math.trunc(sampleCount)))
    : 256;
  const halfSpanHz = kDefaultCwSpanHz / 2.0;
  return {
    frequencyHz: kDefaultCwCenterFrequencyHz,
    startFrequencyHz: kDefaultCwCenterFrequencyHz - halfSpanHz,
    stopFrequencyHz: kDefaultCwCenterFrequencyHz + halfSpanHz,
    sweepPointCount: normalizedSampleCount,
    ifBandwidthHz: 1.0e3,
    portCount: 2,
    excitationPort: 1,
    powerDbm: -10,
    dwellTimeMs: 1,
  };
}

export interface ServiceClientOptions {
  address: string;
  deadlineMs: number;
}

export class ServiceClient {
  private readonly client: grpc.Client;
  private readonly deadlineMs: number;

  constructor(options: ServiceClientOptions) {
    const protoFile = path.resolve(__dirname, "../../../../proto/vna.proto");
    const packageDefinition = protoLoader.loadSync(protoFile, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const descriptor = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
    const vnaPackage = descriptor.vna as grpc.GrpcObject;
    const VnaControlCtor = vnaPackage.VnaControl as grpc.ServiceClientConstructor;

    this.client = new VnaControlCtor(options.address, grpc.credentials.createInsecure());
    this.deadlineMs = options.deadlineMs;
  }

  getServiceStatus(): Promise<ServiceStatus> {
    const deadline = new Date(Date.now() + this.deadlineMs);
    return new Promise<ServiceStatus>((resolve, reject) => {
      (this.client as unknown as {
        getServiceStatus: (
          request: Record<string, never>,
          options: grpc.CallOptions,
          callback: (error: grpc.ServiceError | null, response: Record<string, unknown>) => void,
        ) => void;
      }).getServiceStatus(
        {},
        { deadline },
        (error, response) => {
        if (error) {
          reject(error);
          return;
        }

          const payload = response;
          resolve({
            ready: Boolean(payload.ready),
            state: String(payload.state ?? ""),
            message: String(payload.message ?? ""),
            bootstrapMode: String(payload.bootstrapMode ?? ""),
            configPath: String(payload.configPath ?? ""),
            uptimeMs: Number(payload.uptimeMs ?? 0),
            bindAddress: String(payload.bindAddress ?? ""),
            port: Number(payload.port ?? 0),
            tlsEnabled: Boolean(payload.tlsEnabled),
            logLevel: String(payload.logLevel ?? ""),
            instanceCount: Number(payload.instanceCount ?? 0),
            activeLeaseCount: Number(payload.activeLeaseCount ?? 0),
          });
        },
      );
    });
  }

  validateTopology(topologyId: string, topologyYaml: string): Promise<ValidationResult> {
    const deadline = new Date(Date.now() + this.deadlineMs);
    return new Promise<ValidationResult>((resolve, reject) => {
      (this.client as unknown as {
        validateTopology: (
          request: { id: string; yaml: string },
          options: grpc.CallOptions,
          callback: (error: grpc.ServiceError | null, response: Record<string, unknown>) => void,
        ) => void;
      }).validateTopology(
        { id: topologyId, yaml: topologyYaml },
        { deadline },
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          const payload = response;
          const rawErrors = payload.errors;
          const rawDetails = payload.errorDetails;
          const errors = Array.isArray(rawErrors) ? rawErrors.map((item) => String(item)) : [];
          const errorDetails: TopologyErrorDetail[] = Array.isArray(rawDetails)
            ? rawDetails.map((item) => {
              const detail = item as Record<string, unknown>;
              return {
                code: String(detail.code ?? ""),
                field: String(detail.field ?? ""),
                message: String(detail.message ?? ""),
              };
            })
            : [];

          resolve({
            ok: Boolean(payload.ok),
            errors,
            errorDetails,
          });
        },
      );
    });
  }

  acquireOnce(instanceId: string, sampleCount: number): Promise<AcquisitionSummary> {
    const deadline = new Date(Date.now() + this.deadlineMs);
    return new Promise<AcquisitionSummary>((resolve, reject) => {
      (this.client as unknown as {
        acquire: (
          request: Record<string, unknown>,
          options: grpc.CallOptions,
          callback: (error: grpc.ServiceError | null, response: Record<string, unknown>) => void,
        ) => void;
      }).acquire(
        {
          instanceId,
          sampleCount,
          timeoutMs: Math.max(this.deadlineMs, 1000),
          excitation: {
            mode: 1,
            settlingTimeMs: 0,
            enableAutoTrigger: true,
            cw: buildCwExcitationFromSampleCount(sampleCount),
          },
        },
        { deadline },
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          const payload = response;
          const frequencyFrame = payload.frequencyFrame as Record<string, unknown> | undefined;
          const timeFrame = payload.timeFrame as Record<string, unknown> | undefined;
          const frequencyPoints = frequencyFrame?.points;
          const timePoints = timeFrame?.points;

          let frameType: "frequency" | "time" | "unknown" = "unknown";
          let pointCount = 0;
          if (Array.isArray(frequencyPoints)) {
            frameType = "frequency";
            pointCount = frequencyPoints.length;
          } else if (Array.isArray(timePoints)) {
            frameType = "time";
            pointCount = timePoints.length;
          }

          resolve({
            instanceId: String(payload.instanceId ?? instanceId),
            timestampNs: Number(payload.timestampNs ?? 0),
            frameType,
            pointCount,
          });
        },
      );
    });
  }

  acquireWaveform(
    instanceId: string,
    sampleCount: number,
    mode: WaveformMode,
    traceSource: WaveformTraceSource,
    channelIndex: number,
    visibleTraceIds: string[],
  ): Promise<WaveformPreviewData> {
    const deadline = new Date(Date.now() + this.deadlineMs);
    return new Promise<WaveformPreviewData>((resolve, reject) => {
      (this.client as unknown as {
        acquire: (
          request: Record<string, unknown>,
          options: grpc.CallOptions,
          callback: (error: grpc.ServiceError | null, response: Record<string, unknown>) => void,
        ) => void;
      }).acquire(
        {
          instanceId,
          sampleCount,
          timeoutMs: Math.max(this.deadlineMs, 1000),
          excitation:
            mode === "time"
              ? {
                  mode: 2,
                  settlingTimeMs: 0,
                  enableAutoTrigger: true,
                  pulse: {
                    centerFrequencyHz: 1.0e9,
                    pulseWidthNs: 200,
                    pulsePeriodNs: 2000,
                    powerDbm: -10,
                    riseTimeNs: 20,
                  },
                }
              : {
                  mode: 1,
                  settlingTimeMs: 0,
                  enableAutoTrigger: true,
                  cw: buildCwExcitationFromSampleCount(sampleCount),
                },
        },
        { deadline },
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(buildWaveformPreviewData(response, traceSource, channelIndex, visibleTraceIds));
        },
      );
    });
  }

  streamWaveform(
    instanceId: string,
    sampleCount: number,
    mode: WaveformMode,
    traceSource: WaveformTraceSource,
    channelIndex: number,
    visibleTraceIds: string[],
    maxFrames: number,
    onFrame?: (data: WaveformPreviewData, frameCount: number) => void,
    abortSignal?: AbortSignal,
  ): Promise<WaveformPreviewData> {
    const deadline = new Date(Date.now() + Math.max(this.deadlineMs * 30, 60_000));

    return new Promise<WaveformPreviewData>((resolve, reject) => {
      const call = (this.client as unknown as {
        streamAcquisition: (
          request: Record<string, unknown>,
          options: grpc.CallOptions,
        ) => grpc.ClientReadableStream<Record<string, unknown>>;
      }).streamAcquisition(
        {
          instanceId,
          sampleCount,
          timeoutMs: Math.max(this.deadlineMs, 1000),
          excitation:
            mode === "time"
              ? {
                  mode: 2,
                  settlingTimeMs: 0,
                  enableAutoTrigger: true,
                  pulse: {
                    centerFrequencyHz: 1.0e9,
                    pulseWidthNs: 200,
                    pulsePeriodNs: 2000,
                    powerDbm: -10,
                    riseTimeNs: 20,
                  },
                }
              : {
                  mode: 1,
                  settlingTimeMs: 0,
                  enableAutoTrigger: true,
                  cw: buildCwExcitationFromSampleCount(sampleCount),
                },
        },
        { deadline },
      );
      const hasFrameLimit = Number.isFinite(maxFrames) && maxFrames > 0;

      let finished = false;
      let frameCount = 0;
      let latest: WaveformPreviewData = {
        instanceId,
        timestampNs: 0,
        frameType: "unknown",
        xLabel: "x",
        yLabel: "y",
        traceSource,
        channelIndex,
        visibleTraceIds,
        traces: [],
        points: [],
        markers: [],
      };

      const done = () => {
        if (finished) {
          return;
        }
        finished = true;
        resolve(latest);
      };

      call.on("data", (response) => {
        frameCount += 1;
        latest = buildWaveformPreviewData(response, traceSource, channelIndex, visibleTraceIds);
        onFrame?.(latest, frameCount);
        if (hasFrameLimit && frameCount >= maxFrames) {
          call.cancel();
        }
      });

      call.on("end", done);
      call.on("error", (error: grpc.ServiceError) => {
        if (abortSignal?.aborted || error.code === grpc.status.CANCELLED) {
          done();
          return;
        }
        reject(error);
      });

      if (abortSignal) {
        abortSignal.addEventListener(
          "abort",
          () => {
            call.cancel();
          },
          { once: true },
        );

        if (abortSignal.aborted) {
          call.cancel();
        }
      }
    });
  }

  streamPreview(
    instanceId: string,
    sampleCount: number,
    onFrame?: (frame: StreamPreviewFrame) => void,
    abortSignal?: AbortSignal,
  ): Promise<StreamPreviewSummary> {
    const deadline = new Date(Date.now() + Math.max(this.deadlineMs * 30, 60_000));

    return new Promise<StreamPreviewSummary>((resolve, reject) => {
      const call = (this.client as unknown as {
        streamAcquisition: (
          request: Record<string, unknown>,
          options: grpc.CallOptions,
        ) => grpc.ClientReadableStream<Record<string, unknown>>;
      }).streamAcquisition(
        {
          instanceId,
          sampleCount,
          timeoutMs: Math.max(this.deadlineMs, 1000),
          excitation: {
            mode: 1,
            settlingTimeMs: 0,
            enableAutoTrigger: true,
            cw: buildCwExcitationFromSampleCount(sampleCount),
          },
        },
        { deadline },
      );

      let finished = false;
      let frameCount = 0;
      let latestTimestampNs = 0;
      let lastFrameType: "frequency" | "time" | "unknown" = "unknown";
      let lastPointCount = 0;

      const finish = (canceled: boolean) => {
        if (finished) {
          return;
        }
        finished = true;
        resolve({ frameCount, latestTimestampNs, lastFrameType, lastPointCount, canceled });
      };

      call.on("data", (response) => {
        const payload = response;
        const frequencyFrame = payload.frequencyFrame as Record<string, unknown> | undefined;
        const timeFrame = payload.timeFrame as Record<string, unknown> | undefined;
        const frequencyPoints = frequencyFrame?.points;
        const timePoints = timeFrame?.points;

        frameCount += 1;
        latestTimestampNs = Number(payload.timestampNs ?? latestTimestampNs);
        if (Array.isArray(frequencyPoints)) {
          lastFrameType = "frequency";
          lastPointCount = frequencyPoints.length;
        } else if (Array.isArray(timePoints)) {
          lastFrameType = "time";
          lastPointCount = timePoints.length;
        } else {
          lastFrameType = "unknown";
          lastPointCount = 0;
        }

        onFrame?.({ frameCount, latestTimestampNs, lastFrameType, lastPointCount });
      });

      call.on("end", () => {
        finish(Boolean(abortSignal?.aborted));
      });

      call.on("error", (error: grpc.ServiceError) => {
        if (abortSignal?.aborted || error.code === grpc.status.CANCELLED) {
          finish(true);
          return;
        }
        reject(error);
      });

      if (abortSignal) {
        abortSignal.addEventListener(
          "abort",
          () => {
            call.cancel();
          },
          { once: true },
        );

        if (abortSignal.aborted) {
          call.cancel();
        }
      }
    });
  }

  dispose(): void {
    this.client.close();
  }
}
