import type { AxiosResponse, AxiosRequestConfig } from "axios";
const axios = require("axios");
export default class HttpRequest {
  request;
  constructor(
    baseUrl: string,
    params?: {
      header?: { [key: string]: any }; // 自定义 header
      errorHandel?: (error: any) => Promise<any>; // 自定义 错误处理
      responseHandel?: (response: AxiosResponse) => Promise<any>; // 自定义 错误处理
      timeout?: number;
      timeoutErrorMessage?: string;
    }
  ) {
    this.request = axios.create({
      baseURL: baseUrl,
      timeout: params?.timeout ? params?.timeout : 30000,
      timeoutErrorMessage: params?.timeoutErrorMessage
        ? params?.timeoutErrorMessage
        : "请求超时，请稍后再试",
    });
    this.request.interceptors.request.use(
      async (config: AxiosRequestConfig<any>) => {
        if (params?.header) {
          let header;
          if (typeof params.header === "function")
            header = await params.header(config);
          else header = params.header;

          for (const i in header) {
            if (!config.headers) {
              // @ts-ignore
              config.headers = {};
            }
            if (typeof header[i] === "function") {
              config.headers[i] = header[i]();
            } else {
              config.headers[i] = header[i];
            }
          }
        }

        return config;
      },
      function (error: any) {
        // 对请求错误做些什么
        return Promise.reject(error);
      }
    );
    // 添加响应拦截器
    this.request.interceptors.response.use(
      async function (response: any) {
        // 对响应数据做点什么
        if (params?.responseHandel) {
          return await params.responseHandel(response);
        } else {
          return response.data;
        }
      },
      function (error: any) {
        if (params?.errorHandel) {
          return params.errorHandel(error);
        } else {
          return Promise.reject(error);
        }
      }
    );
  }
}
