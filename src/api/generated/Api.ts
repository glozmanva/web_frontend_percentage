/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface DtoDepositMonthWithLikesResponse {
  /**
   * @format date-time
   * @example "2026-10-20T10:00:00Z"
   */
  created_at: string;
  /** @example 31 */
  days_count?: number | null;
  /** @example "Расчёт за январь" */
  description?: string | null;
  /**
   * @format date-time
   * @example "2026-10-20T10:01:00Z"
   */
  formed_at?: string | null;
  /** @example 1 */
  id: number;
  /** @example "http://localhost:9000/deposit-months/deposit_month_1_image.jpg" */
  image_url?: string | null;
  /** @example 1 */
  is_creator: 0 | 1;
  /** @example 1 */
  is_liked: 0 | 1;
  /** @example 2 */
  likes_count: number;
  /** @example 1 */
  month_number?: number | null;
  /** @example "Январь" */
  name: string;
  /** @example "published" */
  status: "draft" | "published" | "deleted";
  /** @example "http://localhost:9000/deposit-months/deposit_month_1_video.mp4" */
  video_url?: string | null;
}

export interface DtoErrorResponse {
  /** @example "черновик не найден" */
  error: string;
}

export interface DtoDepositMonthResponse {
  /**
   * @format date-time
   * @example "2026-10-20T10:00:00Z"
   */
  created_at: string;
  /** @example 31 */
  days_count?: number | null;
  /** @example "Расчёт за январь" */
  description?: string | null;
  /**
   * @format date-time
   * @example "2026-10-20T10:01:00Z"
   */
  formed_at?: string | null;
  /** @example 1 */
  id: number;
  /** @example "http://localhost:9000/deposit-months/deposit_month_1_image.jpg" */
  image_url?: string | null;
  /** @example 1 */
  month_number?: number | null;
  /** @example "Январь" */
  name: string;
  /** @example "published" */
  status: "draft" | "published" | "deleted";
  /** @example "http://localhost:9000/deposit-months/deposit_month_1_video.mp4" */
  video_url?: string | null;
}

export interface DtoPublishDepositMonthRequest {
  /**
   * @min 28
   * @max 31
   * @example 31
   */
  days_count: number;
  /** @example "Расчёт за январь" */
  description: string;
  /**
   * @min 1
   * @max 12
   * @example 1
   */
  month_number: number;
  /** @example "Январь" */
  name: string;
}

export interface DtoDeleteDepositMonthResponse {
  /** @example 1 */
  id: number;
  /** @example "deleted" */
  status: "deleted";
}

export interface DtoLikeRequest {
  /** @example 1 */
  liked: 0 | 1;
}

export interface DtoLikeResponse {
  /** @example 1 */
  id: number;
  /** @example 2 */
  likeCount: number;
  /** @example 1 */
  liked: 0 | 1;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "/api",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title Deposit Month API
 * @version 1.0
 * @baseUrl /api
 * @contact
 *
 * REST API расчётных месяцев. Публичное чтение и операции создателя по Bearer JWT. Выход отзывает JWT через blacklist Redis.
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  depositMonths = {
    /**
     * @description Фильтрация включительно по числу дней; min_days_count не должен превышать max_days_count. Чтение публичное; при наличии Bearer JWT персональные поля относятся к вошедшему пользователю, иначе равны 0.
     *
     * @tags deposit-months
     * @name GetDepositMonths
     * @summary Список опубликованных расчётных месяцев
     * @request GET:/deposit-months
     */
    getDepositMonths: (
      query?: {
        /**
         * Минимальное число дней
         * @min 28
         * @max 31
         * @default 28
         */
        min_days_count?: number;
        /**
         * Максимальное число дней
         * @min 28
         * @max 31
         * @default 31
         */
        max_days_count?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<DtoDepositMonthWithLikesResponse[], DtoErrorResponse>({
        path: `/deposit-months`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description У вошедшего пользователя может быть один черновик. Все три поля обязательны. Тип файлов проверяется по содержимому.
     *
     * @tags deposit-months
     * @name CreateDepositMonthDraft
     * @summary Создать черновик с изображением и видео
     * @request POST:/deposit-months
     * @secure
     */
    createDepositMonthDraft: (
      data: {
        /** Название расчётного месяца */
        name: string;
        /**
         * Изображение: JPEG, PNG, GIF или WebP
         * @format binary
         */
        image: File;
        /**
         * Видео: MP4, WebM или QuickTime
         * @format binary
         */
        video: File;
      },
      params: RequestParams = {},
    ) =>
      this.request<DtoDepositMonthResponse, DtoErrorResponse>({
        path: `/deposit-months`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * @description Возвращает черновик вошедшего пользователя.
     *
     * @tags deposit-months
     * @name GetDepositMonthDraft
     * @summary Черновик текущего пользователя
     * @request GET:/deposit-months/draft
     * @secure
     */
    getDepositMonthDraft: (params: RequestParams = {}) =>
      this.request<DtoDepositMonthResponse, DtoErrorResponse>({
        path: `/deposit-months/draft`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Публикует черновик вошедшего пользователя и заполняет formed_at.
     *
     * @tags deposit-months
     * @name PublishDepositMonthDraft
     * @summary Заполнить и опубликовать черновик
     * @request PUT:/deposit-months/draft
     * @secure
     */
    publishDepositMonthDraft: (
      request: DtoPublishDepositMonthRequest,
      params: RequestParams = {},
    ) =>
      this.request<DtoDepositMonthResponse, DtoErrorResponse>({
        path: `/deposit-months/draft`,
        method: "PUT",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Без id возвращается первая опубликованная запись. С id и next=false возвращается указанная запись, с next=true — следующая с переходом к первой после последней.
     *
     * @tags deposit-months
     * @name GetDepositMonthFeed
     * @summary Запись ленты
     * @request GET:/deposit-months/feed
     */
    getDepositMonthFeed: (
      query?: {
        /**
         * Положительный ID записи; без параметра — первая запись
         * @min 1
         * @example 1
         */
        id?: number;
        /**
         * false — текущая запись; true — следующая
         * @default false
         */
        next?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<DtoDepositMonthWithLikesResponse, DtoErrorResponse>({
        path: `/deposit-months/feed`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Устанавливает status=deleted для записи вошедшего пользователя.
     *
     * @tags deposit-months
     * @name DeleteDepositMonth
     * @summary Логически удалить свой черновик или опубликованную запись
     * @request DELETE:/deposit-months/{id}
     * @secure
     */
    deleteDepositMonth: (id: number, params: RequestParams = {}) =>
      this.request<DtoDeleteDepositMonthResponse, DtoErrorResponse>({
        path: `/deposit-months/${id}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description liked=1 устанавливает лайк вошедшего пользователя, liked=0 снимает. Повторная установка не создаёт дубликат.
     *
     * @tags deposit-months
     * @name SetDepositMonthLike
     * @summary Установить или снять лайк
     * @request POST:/deposit-months/{id}/like
     * @secure
     */
    setDepositMonthLike: (
      id: number,
      request: DtoLikeRequest,
      params: RequestParams = {},
    ) =>
      this.request<DtoLikeResponse, DtoErrorResponse>({
        path: `/deposit-months/${id}/like`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
}
