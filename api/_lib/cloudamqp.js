const CLOUDAMQP_API_KEY = process.env.CLOUDAMQP_API_KEY || "";
const CLOUDAMQP_API_URL = "https://customer.cloudamqp.com/api";

async function request(path, method, body) {
  const credentials = Buffer.from(`${CLOUDAMQP_API_KEY}:`).toString("base64");
  const res = await fetch(`${CLOUDAMQP_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CloudAMQP ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function createInstance(name, type) {
  if (!CLOUDAMQP_API_KEY) {
    const mockId = Math.random().toString(36).substring(2, 10);
    return {
      id: mockId,
      url: `amqps://mock_${mockId}:mock_pass_${mockId}@bunny.cloudamqp.com/${mockId}`,
      login: `mock_${mockId}`,
      password: `mock_pass_${mockId}`,
      apikey: mockId,
      management_url: `https://customer.cloudamqp.com/instance/${mockId}`,
    };
  }

  const plan = type === "lavinmq" ? "lemur-1" : "lemur";
  return request("/instances", "POST", {
    name,
    plan,
    region: "amazon-web-services::us-east-1",
  });
}

export async function deleteInstance(cloudamqpId) {
  if (!CLOUDAMQP_API_KEY) return null;
  return request(`/instances/${cloudamqpId}`, "DELETE");
}
