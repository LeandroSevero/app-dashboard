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
  user_id?: string;
  mqtt_hostname?: string;
  mqtt_username?: string;
  mqtt_password?: string;
  mqtt_port?: number;
  mqtt_port_tls?: number;
  mongo_db?: string;
  mongo_user?: string;
  mongo_password?: string;
  mongo_collection?: string;
  connection_url?: string;
  expires_at?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  full_name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  applications: Application[];
}

export type AppEventType = "create" | "delete" | "update" | "rotate_password" | "error";

export interface AppEvent {
  id: string;
  user_id: string;
  application_id?: string;
  event_type: AppEventType;
  meta?: Record<string, unknown>;
  created_at: string;
}
