export class BusinessRequestError extends Error {
    status;
    constructor(status) {
        super(`业务请求失败：HTTP ${status}`);
        this.status = status;
        this.name = 'BusinessRequestError';
    }
}
export function businessRequestErrorKey(error) {
    if (!(error instanceof BusinessRequestError))
        return undefined;
    if (error.status === 401)
        return 'errors.unauthorized';
    if (error.status === 403)
        return 'errors.forbidden';
    if (error.status === 503)
        return 'errors.serviceUnavailable';
    return undefined;
}
//# sourceMappingURL=business-request-error.js.map