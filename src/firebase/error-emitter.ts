// A simple event emitter for cross-component communication.
// This is used to propagate Firestore permission errors to a listener component.

class EventEmitter<T> {
  private listeners: ((data: T) => void)[] = [];

  on(listener: (data: T) => void): void {
    this.listeners.push(listener);
  }

  off(listener: (data: T) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  emit(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }
}

export const errorEmitter = new EventEmitter<Error>();
