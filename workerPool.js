export class WorkerPool {
  constructor(workerUrl, size = 3) {
    this.queue = [];
    this.pending = new Map();
    this.workers = Array.from({ length: size }, () => {
      const w = new Worker(workerUrl, { type: 'module' });
      w.busy = false;
      w.currentTaskId = null;
      w.onmessage = (e) => this._onResult(w, e.data);
      w.onerror   = (e) => this._onError(w, e);
      return w;
    });
  }

  run(taskId, payload) {
    return new Promise((resolve, reject) => {
      this.pending.set(taskId, { resolve, reject });
      this.queue.push({ taskId, payload });
      this._dispatch();
    });
  }

  cancel(taskId) {
    this.queue = this.queue.filter(t => t.taskId !== taskId);
    // если задача уже запущена — не можем остановить, просто игнорируем результат
    if (this.pending.has(taskId)) {
      this.pending.get(taskId).reject(new Error('cancelled'));
      this.pending.delete(taskId);
    }
  }

  _dispatch() {
    if (!this.queue.length) return;
    const free = this.workers.find(w => !w.busy);
    if (!free) return;
    const { taskId, payload } = this.queue.shift();
    free.busy = true;
    free.currentTaskId = taskId;
    free.postMessage({ id: taskId, ...payload });
  }

  _onResult(worker, data) {
    const cb = this.pending.get(data.id);
    if (cb) {
      data.status === 'success' ? cb.resolve(data) : cb.reject(new Error(data.message));
      this.pending.delete(data.id);
    }
    worker.busy = false;
    worker.currentTaskId = null;
    this._dispatch();
  }

  _onError(worker, err) {
    const id = worker.currentTaskId;
    if (id && this.pending.has(id)) {
      this.pending.get(id).reject(err);
      this.pending.delete(id);
    }
    worker.busy = false;
    worker.currentTaskId = null;
    this._dispatch();
  }
}
