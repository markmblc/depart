import { EventEmitter } from 'events';

export class Counter extends EventEmitter {

  private _value = 0;

  get isZero() {
    return (this._value === 0)
  }

  onceZero(fn: (...args: any[]) => void) {
    if (this.isZero) return fn();
    this.once('zero', fn);
  }

  increment() {
    this._value++;
  }

  decrement() {
    if (--this._value <= 0) this.emit('zero');
  }
}