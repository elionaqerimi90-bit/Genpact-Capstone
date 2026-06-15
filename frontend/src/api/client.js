import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const { data } = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getResources(params) {
  const { data } = await api.get('/resources', { params });
  return data;
}

export async function createResource(body) {
  const { data } = await api.post('/resources', body);
  return data;
}

export async function updateResource(id, body) {
  const { data } = await api.put(`/resources/${id}`, body);
  return data;
}

export async function deleteResource(id) {
  await api.delete(`/resources/${id}`);
}

export async function updateResourcePosition(id, floor_plan_x, floor_plan_y) {
  const { data } = await api.patch(`/resources/${id}/position`, {
    floor_plan_x,
    floor_plan_y,
  });
  return data;
}

export async function getFloors() {
  const { data } = await api.get('/resources/floors');
  return data;
}

export async function getZones(floor) {
  const { data } = await api.get('/resources/zones', {
    params: floor ? { floor } : {},
  });
  return data;
}

export async function getMyReservations() {
  const { data } = await api.get('/reservations/me');
  return data;
}

export async function createReservation(resource_id, date) {
  const { data } = await api.post('/reservations', {
    resource_id,
    date,
  });
  return data;
}

export async function cancelReservation(id) {
  const { data } = await api.delete(`/reservations/${id}`);
  return data;
}

export async function getFloorPlans() {
  const { data } = await api.get('/floor-plans');
  return data;
}

export async function uploadFloorPlan(floor, file, building = 'HQ') {
  const form = new FormData();
  form.append('floor', floor);
  form.append('building', building);
  form.append('file', file);
  const { data } = await api.post('/floor-plans', form);
  return data;
}

export async function getEmployeeSummary() {
  const { data } = await api.get('/analytics/employee-summary');
  return data;
}

export async function getAnalyticsDashboard() {
  const { data } = await api.get('/analytics/dashboard');
  return data;
}

export async function getUsers() {
  const { data } = await api.get('/users');
  return data;
}

export async function registerUser(body) {
  const { data } = await api.post('/auth/register', body);
  return data;
}
