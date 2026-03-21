export interface Application {
  id: string;
  name: string;
  type: string;
  amqp_url: string;
  username: string;
  password: string;
  cloudamqp_id: string;
  panel_url: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  applications: Application[];
}
