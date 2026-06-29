# Hướng dẫn đổi địa bàn hành chính - Frontend

## 1. Tổng quan

File này dùng để rà soát các cấu hình, dữ liệu demo, label fallback, template/dashboard và chuỗi hardcode trong `gis_fe` khi muốn chuyển hệ thống WebGIS sang xã, phường, huyện, thành phố hoặc khu vực hành chính khác.

Frontend hiện có `config/ward.config.ts` để gom tên địa phương và tọa độ fallback. Tuy nhiên vẫn còn một số dữ liệu demo IOC, script generate dashboard, field label fallback, localStorage key và placeholder tọa độ đang gắn với Ngọc Tố/Cần Thơ. Khi đổi địa bàn, nên ưu tiên cập nhật `ward.config.ts`, API backend/env, dữ liệu dashboard demo/template và kiểm tra map fallback.

## 2. Danh sách file cần kiểm tra khi đổi địa bàn

| File | Biến/Key | Giá trị hiện tại | Ý nghĩa | Cần đổi khi sang địa bàn khác |
|---|---|---|---|---|
| `config/ward.config.ts` | `id` | `ngoc-to` | Slug/id địa bàn frontend | Đổi sang slug mới, ví dụ `phu-my` |
| `config/ward.config.ts` | `name` | `Ngọc Tố` | Tên xã/phường | Đổi sang tên đơn vị mới |
| `config/ward.config.ts` | `locationLabel` | `Xã Ngọc Tố` | Tên hiển thị đầy đủ | Đổi sang `Phường/Xã ...` mới |
| `config/ward.config.ts` | `district` | `Huyện Mỹ Xuyên` | Huyện/quận/thành phố trực thuộc | Đổi sang địa bàn cấp huyện mới |
| `config/ward.config.ts` | `city` | `Thành phố Cần Thơ` | Tỉnh/thành phố | Đổi sang tỉnh/thành phố mới |
| `config/ward.config.ts` | `cityShort` | `TP. Cần Thơ` | Tên tỉnh/thành phố rút gọn | Đổi theo địa bàn mới |
| `config/ward.config.ts` | `center` | `{ lat: 9.4466, lng: 105.9342 }` | Tọa độ fallback khi chưa lấy được `project.mapView` từ API | Đổi sang tâm địa bàn mới |
| `config/ward.config.ts` | `defaultZoom` | `15` | Zoom fallback frontend | Đổi theo kích thước địa bàn mới |
| `config/site.config.ts` | `description` | `Hệ thống thông tin địa lý — ${wardConfig.locationLabel}` | Metadata site dùng `wardConfig` | Tự cập nhật nếu `wardConfig` đúng; kiểm tra nếu rebrand tên hệ thống |
| `.env.example` | `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL backend | Đổi nếu backend địa bàn mới chạy port/domain khác |
| `.env.example` | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `your_mapbox_access_token` | Token map nền | Đổi token triển khai nếu cần |
| `.env.example` | `NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT` | `/api/dashboard-ai` | Proxy AI frontend | Thường giữ nguyên; kiểm tra nếu deploy path khác |
| `.env.example` | `OPENAI_API_KEY`, `OPENAI_DASHBOARD_MODEL` | Rỗng / `gpt-4.1-mini` | AI server-side trong Next route | Không liên quan địa bàn trực tiếp, nhưng cần cấu hình khi deploy |
| `lib/map/vietnam.ts` | Comment/default center | `Trung tâm Xã Ngọc Tố, Huyện Mỹ Xuyên, Cần Thơ` | Tài liệu comment của fallback center | Cập nhật comment theo địa bàn mới |
| `lib/map/vietnam.ts` | `CAN_THO_BOUNDS` | `[[105.45, 9.35], [106.15, 10.45]]` | Giới hạn pan theo Cần Thơ/ĐBSCL | Đổi sang bounds tỉnh/khu vực mới nếu không còn ở Cần Thơ/ĐBSCL |
| `lib/map/vietnam.ts` | Fallback ngoài Việt Nam | `WARD_DEFAULT_CENTER` | Khi tọa độ invalid sẽ về `wardConfig.center` | Chỉ cần `wardConfig.center` đúng |
| `data/agri-dashboard.json` | `meta.ward`, `meta.district`, `meta.city` | `Ngọc Tố`, `Huyện Mỹ Xuyên`, `Thành phố Cần Thơ` | Dữ liệu demo IOC tĩnh | Đổi hoặc bỏ nếu dashboard động lấy từ API |
| `data/agri-dashboard.json` | Tên đơn vị demo | `THT ... Ngọc Tố`, khu vực Bình... | Dữ liệu seed/mock/demo | Thay bằng demo địa bàn mới hoặc dùng dữ liệu thật |
| `scripts/generate-agri-dashboard-data.mjs` | `data.meta` | `Ngọc Tố`, `Huyện Mỹ Xuyên`, `Thành phố Cần Thơ` | Script generate `agri-dashboard.json` | Đổi meta khi regenerate demo |
| `scripts/generate-agri-dashboard-data.mjs` | Comment usage | `gis_ngocto_web` | Tên project cũ | Đổi nếu rebrand package/source |
| `lib/dashboard/agri-data.ts` | Fallback area | `Ngọc Tố` | Fallback khi data demo thiếu khu vực | Đổi sang tên địa bàn mới nếu vẫn dùng dashboard demo |
| `components/dashboard/ioc/ioc-charts.tsx` | `shortenOrgName()` suffix | ` Ngọc Tố` | Cắt hậu tố Ngọc Tố khỏi tên HTX/THT trong chart demo | Đổi suffix theo địa bàn mới hoặc bỏ logic cắt riêng |
| `components/layout/sidebar-user-panel.tsx` | `suffix` | ` Ngọc Tố` | Rút gọn tên user `Quản trị viên Ngọc Tố` trong sidebar | Đổi theo địa bàn mới hoặc xử lý theo tenant/ward config |
| `lib/fields/field-label.ts` | Option label `tp_tinh.can_tho` | `Cần Thơ` | Fallback label cho enum tỉnh/thành | Thêm/đổi option theo dữ liệu địa bàn mới nếu metadata thiếu dictionary |
| `lib/fields/field-label.ts` | Option label `ten_xa.ngoc_to` | `Ngọc Tố` | Fallback label xã | Thêm/đổi option theo địa bàn mới nếu metadata thiếu dictionary |
| `lib/fields/field-label.ts` | `don_vi_quan_ly.ubnd_xa_ngoc_to` | `UBND xã Ngọc Tố` | Fallback label đơn vị quản lý | Đổi/thêm label mới nếu metadata chưa trả dictionary |
| `components/form/lat-lng-field.tsx` | Placeholder lat/lng | `9.4466`, `105.9342` | Gợi ý nhập tọa độ trong form | Đổi placeholder sang địa bàn mới nếu muốn đúng ngữ cảnh |
| `components/form/line-string-field.tsx` | Placeholder lat/lng | `9.4466`, `105.9342` | Gợi ý nhập tọa độ đường | Đổi placeholder sang địa bàn mới |
| `components/form/area-polygon-field.tsx` | Placeholder lat/lng | `9.4466`, `105.9342` | Gợi ý nhập tọa độ vùng | Đổi placeholder sang địa bàn mới |
| `lib/dashboard/templates/custom-templates.ts` | localStorage key | `gis_ngocto.dashboard.customTemplates.v1` | Key lưu template custom local | Nên đổi namespace nếu deploy nhiều địa bàn cùng domain |
| `providers/message-provider.tsx` | localStorage key | `gis_ngocto.message_history.v1` | Lưu lịch sử message local | Nên đổi namespace nếu cần tách tenant/domain |
| `lib/audit/audit-log.ts` | localStorage key | `gis_ngocto.audit_log.v1` | Audit log frontend local | Nên đổi namespace nếu cần tách địa bàn |
| `lib/table/table-preferences.ts` | localStorage key prefix | `gis_ngocto.table_preferences...` | Preference bảng theo user/layer/table | Nên đổi namespace nếu dùng cùng browser cho nhiều địa bàn |
| `package.json` | `name` | `gis_ngocto_web` | Tên package frontend | Không ảnh hưởng runtime, nhưng nên đổi khi rebrand source |
| `components/import/geojson-import-dialog.tsx` | `current_ward` label | `Boundary hiện tại (${wardConfig.locationLabel})` | Filter import theo ranh hiện tại | Đã dùng `wardConfig`; chỉ cần đảm bảo backend boundary đúng |
| `components/map/use-ward-boundary.ts` | API boundary | Lấy từ `mapView.boundaryEndpoint`/endpoint backend | Ranh hiển thị trên map | Kiểm tra backend trả đúng boundary mới |
| `components/map/map-page-content.tsx` | `mapView`/boundary props | Lấy từ API/helper | Center/bounds bản đồ chính | Kiểm tra sau đổi backend/env |
| `components/dashboard/dynamic-dashboard-view.tsx` | Dashboard widgets JSON | Lấy từ API/dashboard draft | Dashboard có thể chứa source/filter cũ | Khi clone DB cũ, kiểm tra `layerId/datasetId/viewId/field` |
| `lib/dashboard/templates/*.ts` | Template mặc định | Template domain nông nghiệp/thủy sản/lúa/OCOP/cảnh báo | Không hardcode địa bàn, nhưng có placeholder theo domain | Kiểm tra có phù hợp địa bàn mới không |
| `lib/dashboard/ai/prompt-examples.ts` | Prompt mẫu | IOC, OCOP, thủy sản, lúa... | Gợi ý AI theo domain hiện tại | Cập nhật domain nếu địa bàn mới không dùng nông nghiệp |

## 3. Các giá trị hiện đang hardcode

Các giá trị địa bàn xuất hiện trong frontend:

- Tên xã/phường: `Ngọc Tố`.
- Tên huyện: `Huyện Mỹ Xuyên`.
- Tên thành phố/tỉnh: `Thành phố Cần Thơ`, `TP. Cần Thơ`, `Cần Thơ`.
- Slug/package/storage namespace: `ngoc-to`, `gis_ngocto_web`, `gis_ngocto.*`.
- Tọa độ fallback/placeholder: `9.4466`, `105.9342`.
- Bounds Cần Thơ: `[[105.45, 9.35], [106.15, 10.45]]`.
- Dữ liệu demo: `THT Nuôi lươn Ngọc Tố`, `THT Mít Thái VietGAP Ngọc Tố`, `THT Nông nghiệp Ngọc Tố`, các khu vực Bình Lợi/Bình Trung/Bình Hòa...
- Label fallback enum: `can_tho -> Cần Thơ`, `ngoc_to -> Ngọc Tố`, `ubnd_xa_ngoc_to -> UBND xã Ngọc Tố`.

Các file đã phát hiện có giá trị cần kiểm tra:

- `config/ward.config.ts`
- `config/site.config.ts`
- `.env.example`
- `data/agri-dashboard.json`
- `scripts/generate-agri-dashboard-data.mjs`
- `lib/map/vietnam.ts`
- `lib/dashboard/agri-data.ts`
- `components/dashboard/ioc/ioc-charts.tsx`
- `components/layout/sidebar-user-panel.tsx`
- `lib/fields/field-label.ts`
- `components/form/lat-lng-field.tsx`
- `components/form/line-string-field.tsx`
- `components/form/area-polygon-field.tsx`
- `lib/dashboard/templates/custom-templates.ts`
- `providers/message-provider.tsx`
- `lib/audit/audit-log.ts`
- `lib/table/table-preferences.ts`
- `package.json`

Mục cần kiểm tra thêm dù không nhất thiết hardcode địa bàn:

- Dashboard/template/AI files trong `lib/dashboard/templates/` và `lib/dashboard/ai/`: chủ yếu metadata-driven nhưng domain mặc định là nông nghiệp/IOC/OCOP/cảnh báo.
- `components/map/*`: đa số lấy `mapView` từ API; cần test với backend boundary mới.
- `components/import/geojson-import-dialog.tsx`: filter `current_ward` phụ thuộc backend boundary và `wardConfig.locationLabel`.

## 4. Cách đổi sang xã/thành phố khác

1. Đổi tên hiển thị địa phương:
   - Cập nhật `config/ward.config.ts`: `id`, `name`, `locationLabel`, `district`, `city`, `cityShort`.
   - Kiểm tra `config/site.config.ts` để title/description đúng.
2. Đổi mã hành chính nếu có:
   - Frontend không giữ mã hành chính chính thức; mã nằm ở backend `WARD_BOUNDARY_ADMIN_CODE`.
   - Nếu có field/filter mã hành chính trong dashboard hoặc data demo, cập nhật dữ liệu tương ứng.
3. Đổi tọa độ center:
   - Cập nhật `wardConfig.center`.
   - Backend vẫn là nguồn ưu tiên qua `GET /api/layers -> project.mapView`; hãy đảm bảo backend env/boundary đúng.
4. Đổi bounds:
   - Cập nhật `CAN_THO_BOUNDS` trong `lib/map/vietnam.ts` nếu địa bàn mới không thuộc vùng bounds hiện tại.
   - Kiểm tra bản đồ fit theo `project.mapView.bounds`.
5. Đổi dữ liệu boundary:
   - Chủ yếu ở backend.
   - Frontend cần kiểm tra `use-ward-boundary`, MiniMap và map page có nhận boundary mới.
6. Đổi layer mặc định:
   - Layer động lấy từ API; nếu DB mới chưa có layer thì trang map/dashboard sẽ trống.
   - Kiểm tra Template Wizard/AI auto mapping với layer mới.
7. Đổi seed/demo data nếu có:
   - Cập nhật `data/agri-dashboard.json` hoặc chạy lại `scripts/generate-agri-dashboard-data.mjs` sau khi sửa meta/source demo.
8. Kiểm tra dashboard/template:
   - Dashboard draft/published từ DB cũ có thể chứa `layerId/datasetId/viewId/fieldCode` cũ.
   - Custom template lưu localStorage theo key `gis_ngocto...`; cân nhắc đổi namespace hoặc clear localStorage.
9. Build/test:
   - Chạy frontend với backend mới.
   - Kiểm tra `/`, `/ban-do`, `/quan-tri/layers`, dashboard builder, Template Wizard, AI Assistant, MiniMap.
   - Chạy `npm run build`.

## 5. Những phần nên đưa về .env hoặc config tập trung

Nên đưa các giá trị frontend sau về `.env` hoặc config tập trung:

| Biến đề xuất | Ý nghĩa | Hiện trạng |
|---|---|---|
| `NEXT_PUBLIC_DEFAULT_ADMIN_ID` | Slug địa bàn frontend | Đang hardcode `wardConfig.id` |
| `NEXT_PUBLIC_DEFAULT_ADMIN_NAME` | Tên xã/phường | Đang hardcode trong `ward.config.ts` |
| `NEXT_PUBLIC_DEFAULT_ADMIN_LABEL` | Tên đầy đủ, ví dụ `Xã Ngọc Tố` | Đang hardcode trong `ward.config.ts` |
| `NEXT_PUBLIC_DEFAULT_DISTRICT_NAME` | Huyện/quận | Đang hardcode trong `ward.config.ts` |
| `NEXT_PUBLIC_DEFAULT_PROVINCE_NAME` | Tỉnh/thành phố | Đang hardcode trong `ward.config.ts` |
| `NEXT_PUBLIC_DEFAULT_MAP_CENTER` | Center fallback dạng `lat,lng` | Đang hardcode trong `ward.config.ts` |
| `NEXT_PUBLIC_DEFAULT_MAP_ZOOM` | Zoom fallback | Đang hardcode trong `ward.config.ts` |
| `NEXT_PUBLIC_DEFAULT_PAN_BOUNDS` | Bounds giới hạn kéo map | Đang hardcode `CAN_THO_BOUNDS` |
| `NEXT_PUBLIC_STORAGE_NAMESPACE` | Prefix localStorage | Đang rải `gis_ngocto.*` ở message/audit/template/table prefs |
| `NEXT_PUBLIC_PROJECT_DISPLAY_NAME` | Tên site nếu không lấy từ backend | Đang dùng `OneGis` + ward description |
| `NEXT_PUBLIC_DEFAULT_BOUNDARY_LAYER_ID` | Nếu sau này dùng boundary layer thật thay API boundary | Chưa có |

Các biến đã có:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_DASHBOARD_AI_ENDPOINT`
- `OPENAI_API_KEY` server-side trong Next route, không public
- `OPENAI_DASHBOARD_MODEL`

## 6. Rủi ro khi đổi địa bàn

- Map vẫn zoom về Ngọc Tố nếu backend `project.mapView` lỗi và frontend fallback `wardConfig.center` chưa đổi.
- Pan bounds vẫn giới hạn Cần Thơ nếu không đổi `CAN_THO_BOUNDS`.
- Ranh MiniMap/map không hiện nếu backend boundary không match feature hoặc endpoint lỗi.
- Dữ liệu demo IOC vẫn hiển thị Ngọc Tố nếu `data/agri-dashboard.json` chưa cập nhật.
- Dashboard/template map nhầm field nếu dùng dashboard/template cũ với layer mới.
- Label fallback trong `field-label.ts` có thể hiển thị Ngọc Tố/Cần Thơ nếu metadata backend thiếu dictionary/options.
- Custom template/message/audit/table preferences trong localStorage có namespace `gis_ngocto`, dễ lẫn nếu nhiều địa bàn dùng cùng domain/browser.
- Form tọa độ vẫn gợi ý tọa độ Ngọc Tố nếu chưa đổi placeholder.
- Sidebar user có thể cắt sai hậu tố tên nếu vẫn dùng suffix ` Ngọc Tố`.

## 7. Kết luận

Các file frontend quan trọng nhất cần đổi/kiểm tra khi chuyển địa bàn là:

1. `config/ward.config.ts`
2. `lib/map/vietnam.ts`
3. `data/agri-dashboard.json`
4. `scripts/generate-agri-dashboard-data.mjs`
5. `lib/fields/field-label.ts`
6. `components/layout/sidebar-user-panel.tsx`
7. `components/dashboard/ioc/ioc-charts.tsx`
8. `components/form/lat-lng-field.tsx`, `components/form/line-string-field.tsx`, `components/form/area-polygon-field.tsx`
9. `lib/dashboard/templates/custom-templates.ts`, `providers/message-provider.tsx`, `lib/audit/audit-log.ts`, `lib/table/table-preferences.ts` nếu cần đổi namespace localStorage

Frontend đã có hướng lấy `mapView` và boundary từ backend, nên đổi đúng backend `WARD_*` và boundary GeoJSON là bước quan trọng nhất. Sau đó cập nhật `wardConfig`, demo dashboard và các fallback/namespace còn lại để UI không còn hiển thị nhầm địa bàn cũ.
