import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class CurlHelper {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get(
    endpoint: string,
    headers: Record<string, string> = {},
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.baseUrl}${endpoint}`,
      headers,
    };
    return axios(config);
  }

  async post(
    endpoint: string,
    data: any,
    headers: Record<string, string> = {},
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.baseUrl}${endpoint}`,
      data,
      headers,
    };
    return axios(config);
  }

  async put(
    endpoint: string,
    data: any,
    headers: Record<string, string> = {},
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: `${this.baseUrl}${endpoint}`,
      data,
      headers,
    };
    return axios(config);
  }

  async delete(
    endpoint: string,
    headers: Record<string, string> = {},
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: 'DELETE',
      url: `${this.baseUrl}${endpoint}`,
      headers,
    };
    return axios(config);
  }
}

export default CurlHelper;
