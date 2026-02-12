import * as path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { ServiceStatus } from "./types";

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

  dispose(): void {
    this.client.close();
  }
}
