export type PaginatedResult<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type UserResponse = {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};
