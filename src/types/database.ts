export interface Database {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          amqp_url: string;
          username: string;
          password: string;
          cloudamqp_id: string;
          panel_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          amqp_url?: string;
          username?: string;
          password?: string;
          cloudamqp_id?: string;
          panel_url?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          amqp_url?: string;
          username?: string;
          password?: string;
          cloudamqp_id?: string;
          panel_url?: string;
        };
      };
    };
  };
}

export interface Application {
  id: string;
  user_id: string;
  name: string;
  type: string;
  amqp_url: string;
  username: string;
  password: string;
  cloudamqp_id: string;
  panel_url: string;
  created_at: string;
}
