export class TaskError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'TaskError';
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
  }
}
