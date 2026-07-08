import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/tasks/route';
import { tasks } from '@/db/schema';

// Mocks
const mockInsertValuesFn = vi.fn();
const mockInsertFn = vi.fn().mockImplementation(() => ({
  values: mockInsertValuesFn
}));

const mockOrderByFn = vi.fn();
const mockFromFn = vi.fn().mockImplementation(() => ({
  orderBy: mockOrderByFn
}));
const mockSelectFn = vi.fn().mockImplementation(() => ({
  from: mockFromFn
}));

const mockDeleteWhereFn = vi.fn();
const mockDeleteFn = vi.fn().mockImplementation(() => ({
  where: mockDeleteWhereFn
}));

vi.mock('@/db/index', () => {
  return {
    db: {
      insert: (table: any) => mockInsertFn(table),
      select: () => mockSelectFn(),
      delete: (table: any) => mockDeleteFn(table)
    }
  };
});

describe('/api/tasks API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return all tasks ordered correctly', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', completed: 0 },
        { id: 2, title: 'Task 2', completed: 1 }
      ];
      mockOrderByFn.mockResolvedValueOnce(mockTasks);

      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.tasks).toEqual(mockTasks);
      expect(mockSelectFn).toHaveBeenCalled();
      expect(mockFromFn).toHaveBeenCalledWith(tasks);
    });

    it('should return 500 when fetch fails', async () => {
      mockOrderByFn.mockRejectedValueOnce(new Error('Fetch error'));

      const response = await GET();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Failed to fetch tasks');
    });
  });

  describe('POST', () => {
    it('should return success and not call insert if tasks array is empty', async () => {
      const req = new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ tasks: [] })
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it('should insert tasks and return success', async () => {
      const inputTasks = [
        { title: 'New Task', estimatedTime: '30m', emotionalIntensity: 'low' }
      ];
      mockInsertValuesFn.mockResolvedValueOnce({});

      const req = new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ tasks: inputTasks })
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockInsertFn).toHaveBeenCalledWith(tasks);
      expect(mockInsertValuesFn).toHaveBeenCalledWith([
        {
          title: 'New Task',
          description: null,
          estimatedTime: '30m',
          emotionalIntensity: 'low',
          dueDate: null,
          parentId: null,
          recurrence: 'none'
        }
      ]);
    });

    it('should return 500 when insert fails', async () => {
      mockInsertValuesFn.mockRejectedValueOnce(new Error('Insert error'));

      const req = new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ tasks: [{ title: 'Failing task' }] })
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Failed to save tasks');
    });
  });

  describe('DELETE', () => {
    it('should clear completed tasks and return success', async () => {
      mockDeleteWhereFn.mockResolvedValueOnce({});

      const response = await DELETE();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockDeleteFn).toHaveBeenCalledWith(tasks);
      expect(mockDeleteWhereFn).toHaveBeenCalled();
    });

    it('should return 500 when delete fails', async () => {
      mockDeleteWhereFn.mockRejectedValueOnce(new Error('Delete error'));

      const response = await DELETE();
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Failed to clear completed tasks');
    });
  });
});
