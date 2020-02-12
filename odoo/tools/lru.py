# -*- coding: utf-8 -*-
import collections
import threading

from .func import synchronized

__all__ = ['LRU']

class LRU(object):
    """
    Implementation of a length-limited O(1) LRU map.

    Original Copyright 2003 Josiah Carlson, later rebuilt on OrderedDict.
    """
    def __init__(self, count, pairs=()):
        self._lock = threading.RLock()
        self.count = max(count, 1)
        self.d = collections.OrderedDict(pairs)

    @synchronized()
    def __contains__(self, obj):
        return obj in self.d

    def get(self, obj, val=None):
        try:
            return self[obj]
        except KeyError:
            return val

    @synchronized()
    def __getitem__(self, obj):
        a = self.d[obj]
        self.d.move_to_end(obj, last=False)
        return a

    @synchronized()
    def __setitem__(self, obj, val):
        self.d[obj] = val
        self.d.move_to_end(obj, last=False)
        while len(self.d) > self.count:
            self.d.popitem(last=True)

    @synchronized()
    def __delitem__(self, obj):
        del self.d[obj]

    @synchronized()
    def __iter__(self):
        yield from self.d

    @synchronized()
    def __len__(self):
        return len(self.d)

    @synchronized()
    def iteritems(self):
        yield from self.d.items()
    items = iteritems

    @synchronized()
    def iterkeys(self):
        yield from self.d

    @synchronized()
    def itervalues(self):
        yield from self.d.values()

    @synchronized()
    def keys(self):
        return list(self.d)

    @synchronized()
    def pop(self,key):
        return self.d.pop(key)

    @synchronized()
    def clear(self):
        self.d.clear()
