# Hướng dẫn đổi địa bàn hành chính - Frontend

## 0. Checklist đổi địa bàn nhanh

Sửa các biến frontend thực tế nhất trong `.env.local` hoặc env deploy:

- `NEXT_PUBLIC_DEFAULT_WARD_ID`
- `NEXT_PUBLIC_DEFAULT_WARD_NAME`
- `NEXT_PUBLIC_DEFAULT_WARD_LABEL`
- `NEXT_PUBLIC_DEFAULT_DISTRICT_NAME`
- `NEXT_PUBLIC_DEFAULT_PROVINCE_NAME`
- `NEXT_PUBLIC_DEFAULT_PROVINCE_SHORT`
- `NEXT_PUBLIC_DEFAULT_MAP_CENTER`
- `NEXT_PUBLIC_DEFAULT_MAP_ZOOM`
- `NEXT_PUBLIC_DEFAULT_PAN_BOUNDS`
- `NEXT_PUBLIC_STORAGE_NAMESPACE`
- `NEXT_PUBLIC_API_URL`

Cảnh báo nhanh:

- Nếu dùng dashboard demo thì phải regenerate `data/agri-dashboard.json`.
- Nếu giữ dashboard cũ, phải kiểm tra lại `layerId`, `datasetId`, `viewId` và `fieldKey`.

## 1. Tổng quan

File này hướng dẫn đổi frontend WebGIS sang địa bàn hành chính khác sau khi đã gom cấu hình địa bàn vào `config/ward.config.ts`, biến `NEXT_PUBLIC_*` và helper dùng chung.

Frontend ưu tiên dữ liệu mapView/boundary từ backend. Các biến frontend là fallback và cấu hình UI/localStorage. Nếu backend đã đổi đúng `WARD_*`, frontend thường chỉ cần đổi `.env.local` public tương ứng.

## 2. Danh sách file cần kiểm tra khi đổi địa bàn

| File | Biến/Key | Giá trị hiện tại | Ý nghĩa | Cần đổi khi sang địa bàn khác |
|---|---|---|---|---|
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_WARD_ID` | `ngoc-to` | Slug/id địa bàn frontend | Đổi slug mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_WARD_NAME` | `Ngọc Tố` | Tên xã/phường | Đổi tên đơn vị mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_WARD_LABEL` | `Xã Ngọc Tố` | Tên đầy đủ hiển thị | Đổi `Xã/Phường ...` mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_DISTRICT_NAME` | `Huyện Mỹ Xuyên` | Huyện/quận | Đổi cấp huyện mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_PROVINCE_NAME` | `Thành phố Cần Thơ` | Tỉnh/thành phố | Đổi cấp tỉnh mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_PROVINCE_SHORT` | `TP. Cần Thơ` | Tên tỉnh rút gọn | Đổi theo địa bàn mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_COUNTRY_NAME` | `Việt Nam` | Quốc gia | Thường giữ nguyên |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_MAP_CENTER` | `9.4466,105.9342` | Center fallback và placeholder tọa độ | Đổi `lat,lng` địa bàn mới |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_MAP_ZOOM` | `15` | Zoom fallback | Đổi theo diện tích địa bàn |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_DEFAULT_PAN_BOUNDS` | `105.45,9.35,106.15,10.45` | Bounds giới hạn kéo bản đồ | Đổi `minLng,minLat,maxLng,maxLat` |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_STORAGE_NAMESPACE` | `ngoc-to` | Prefix localStorage | Đổi namespace nếu nhiều địa bàn cùng domain |
| `.env.local` hoặc env deploy | `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend API | Đổi domain/port backend mới |
| `config/ward.config.ts` | Fallback env parser | Ngọc Tố/Cần Thơ | Config tập trung FE | Chỉ sửa nếu không dùng env |
| `lib/map/vietnam.ts` | `WARD_DEFAULT_CENTER`, `CAN_THO_BOUNDS` | Đọc từ `wardConfig` | Fallback map center/pan bounds | Không cần sửa nếu env đúng |
| `lib/map/coordinate-placeholders.ts` | `getCoordinatePlaceholders()` | Đọc từ `wardConfig.center` | Placeholder lat/lng cho form | Không cần sửa nếu env đúng |
| `lib/config/storage.ts` | `getStorageKey()` | Đọc từ `wardConfig.storageNamespace` | Prefix storage keys | Không cần sửa nếu env đúng |
| `components/form/lat-lng-field.tsx` | Placeholder | Từ `getCoordinatePlaceholders()` | Form point | Không cần sửa trực tiếp |
| `components/form/line-string-field.tsx` | Placeholder | Từ `getCoordinatePlaceholders()` | Form line | Không cần sửa trực tiếp |
| `components/form/area-polygon-field.tsx` | Placeholder | Từ `getCoordinatePlaceholders()` | Form polygon | Không cần sửa trực tiếp |
| `components/layout/sidebar-user-panel.tsx` | Suffix display name | Từ `wardConfig.name` | Rút gọn tên user | Không cần sửa trực tiếp |
| `components/dashboard/ioc/ioc-charts.tsx` | Suffix org name | Từ `wardConfig.name` | Rút gọn HTX/THT demo | Không cần sửa trực tiếp |
| `lib/dashboard/templates/custom-templates.ts` | localStorage key | `getStorageKey("dashboard.customTemplates.v1")` | Custom template local | Không cần sửa trực tiếp |
| `providers/message-provider.tsx` | localStorage key | `getStorageKey("message_history.v1")` | Message history | Không cần sửa trực tiếp |
| `lib/audit/audit-log.ts` | localStorage key | `getStorageKey("audit_log.v1")` | Audit log local | Không cần sửa trực tiếp |
| `lib/table/table-preferences.ts` | localStorage key | `getStorageKey("table_preferences...")` | Table prefs | Không cần sửa trực tiếp |
| `lib/fields/field-label.ts` | Fallback labels | `wardConfig.city`, `wardConfig.name`, `wardConfig.locationLabel` | Fallback khi metadata thiếu dictionary | Không cần sửa trực tiếp; vẫn ưu tiên metadata thật |
| `data/agri-dashboard.json` | Demo meta/data | Ngọc Tố/Cần Thơ | Dashboard demo tĩnh | Thay demo mới nếu còn dùng IOC static |
| `scripts/generate-agri-dashboard-data.mjs` | `wardMeta` | Đọc env/fallback | Script generate demo JSON | Chạy với env mới khi regenerate |
| `package.json` | `name` | `gis_ngocto_web` | Tên package | Không ảnh hưởng runtime; đổi nếu rebrand |

## 3. Các giá trị hiện đang hardcode

Đã refactor khỏi runtime UI chính:

- Tọa độ placeholder trong form lấy từ `getCoordinatePlaceholders()`.
- Pan bounds và default center lấy từ `wardConfig`.
- LocalStorage key dùng `getStorageKey()`.
- Sidebar/user suffix, IOC chart suffix và một số fallback label dùng `wardConfig`.

Còn giữ có chủ đích:

- Fallback trong `config/ward.config.ts`: giúp app chạy nếu thiếu env.
- `data/agri-dashboard.json`: dữ liệu demo đã sinh, vẫn là Ngọc Tố.
- Một số nội dung demo/domain nông nghiệp trong template/AI prompt: không phải cấu hình địa bàn trực tiếp.
- `package.json` name `gis_ngocto_web`: không ảnh hưởng runtime.

## 4. Cách đổi sang xã/thành phố khác

1. Cập nhật backend trước:
   - `WARD_*`
   - boundary GeoJSON
   - `PROJECT_*`
2. Cập nhật frontend `.env.local`:
   - `NEXT_PUBLIC_DEFAULT_WARD_ID`
   - `NEXT_PUBLIC_DEFAULT_WARD_NAME`
   - `NEXT_PUBLIC_DEFAULT_WARD_LABEL`
   - `NEXT_PUBLIC_DEFAULT_DISTRICT_NAME`
   - `NEXT_PUBLIC_DEFAULT_PROVINCE_NAME`
   - `NEXT_PUBLIC_DEFAULT_PROVINCE_SHORT`
   - `NEXT_PUBLIC_DEFAULT_MAP_CENTER`
   - `NEXT_PUBLIC_DEFAULT_MAP_ZOOM`
   - `NEXT_PUBLIC_DEFAULT_PAN_BOUNDS`
   - `NEXT_PUBLIC_STORAGE_NAMESPACE`
   - `NEXT_PUBLIC_API_URL`
3. Nếu không dùng env, sửa fallback trong `config/ward.config.ts`.
4. Nếu vẫn dùng dashboard demo:
   - Cập nhật `data/agri-dashboard.json`, hoặc
   - Chạy lại `scripts/generate-agri-dashboard-data.mjs` với env mới.
5. Kiểm tra dashboard/template:
   - Dashboard DB cũ có thể trỏ source/field cũ.
   - Custom template trong localStorage cũ nằm dưới namespace cũ.
6. Build/test:
   - `/`
   - `/ban-do`
   - `/quan-tri/layers`
   - dashboard builder
   - Template Wizard / AI Assistant
   - MiniMap/boundary.

## 5. Những phần nên đưa về .env hoặc config tập trung

Đã gom:

- `NEXT_PUBLIC_DEFAULT_WARD_ID`
- `NEXT_PUBLIC_DEFAULT_WARD_NAME`
- `NEXT_PUBLIC_DEFAULT_WARD_LABEL`
- `NEXT_PUBLIC_DEFAULT_DISTRICT_NAME`
- `NEXT_PUBLIC_DEFAULT_PROVINCE_NAME`
- `NEXT_PUBLIC_DEFAULT_PROVINCE_SHORT`
- `NEXT_PUBLIC_DEFAULT_COUNTRY_NAME`
- `NEXT_PUBLIC_DEFAULT_MAP_CENTER`
- `NEXT_PUBLIC_DEFAULT_MAP_ZOOM`
- `NEXT_PUBLIC_DEFAULT_PAN_BOUNDS`
- `NEXT_PUBLIC_STORAGE_NAMESPACE`

Đã có từ trước:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT`
- `OPENAI_API_KEY` server-side trong Next route
- `OPENAI_DASHBOARD_MODEL`

Nên cân nhắc phase sau:

- Chuyển `data/agri-dashboard.json` thành dữ liệu động từ API hoặc seed theo địa bàn.
- Tách domain template nông nghiệp khỏi core nếu triển khai địa bàn phi nông nghiệp.

## 6. Rủi ro khi đổi địa bàn

- Backend mapView sai thì frontend vẫn có thể fallback về center env; cần đổi cả hai phía.
- `NEXT_PUBLIC_DEFAULT_PAN_BOUNDS` quá hẹp sẽ làm kéo bản đồ bị giới hạn sai.
- Demo dashboard vẫn hiển thị Ngọc Tố nếu chưa thay `data/agri-dashboard.json`.
- Custom template/message/audit/table prefs có thể còn ở namespace cũ trong localStorage.
- Fallback label chỉ dùng khi metadata thiếu; nếu dictionary backend đúng thì UI lấy metadata thật.
- Dashboard/widget trong DB cũ vẫn có source/field cũ dù frontend config đã đổi.

## 7. Kết luận

Sau refactor, đổi frontend chủ yếu bằng `.env.local` hoặc env deploy. Các file quan trọng nhất:

1. `.env.local` / biến môi trường deploy.
2. `config/ward.config.ts` nếu không dùng env.
3. `data/agri-dashboard.json` nếu còn dùng demo IOC static.
4. `scripts/generate-agri-dashboard-data.mjs` nếu regenerate demo.

Các nơi từng hardcode storage/tọa độ/tên địa bàn trong component đã chuyển sang helper/config tập trung.
