# Giới thiệu Ứng dụng Học Tiếng Trung PWA

## Tổng quan về dự án
- Tên ứng dụng: **Chinese PWA**
- Mục tiêu: Giao tiếp cơ bản trong 7 tháng (20 phút/ngày)
- Nền tảng: Web Progressive App (PWA) - Cài đặt như app thật trên Android/iOS
- Hosting: GitHub Pages (Hoàn toàn miễn phí)

## Công nghệ Progressive Web App (PWA)
- **Cài đặt dễ dàng:** Không cần thông qua App Store hay Play Store
- **Offline hoàn toàn:** Sử dụng Service Worker để cache dữ liệu, học mọi lúc mọi nơi
- **Tốc độ vượt trội:** Tải trang tức thì nhờ chiến lược Cache First
- **Trải nghiệm mượt mà:** Giao diện Standalone loại bỏ thanh địa chỉ trình duyệt

## Thuật toán Spaced Repetition (SRS)
- **Tối ưu hóa ghi nhớ:** Sử dụng biến thể thuật toán SM-2
- **Ôn tập đúng lúc:** Hệ thống tự động tính toán thời điểm bạn sắp quên để nhắc nhở
- **Tiết kiệm thời gian:** Tập trung vào những từ khó, giảm thời gian cho từ đã thuộc
- **Dữ liệu cục bộ:** Tiến độ học tập được lưu an toàn trong localStorage

## Tính năng Flashcard Thông minh
- **Giao diện trực quan:** Thiết kế thẻ lật (Flip card) với hiệu ứng CSS3 mượt mà
- **Đa phương tiện:** Hiển thị đồng thời Hán tự, Pinyin, Nghĩa tiếng Việt và Ví dụ
- **Tương tác:** Nhấn để lật thẻ, chọn "Nhớ" hoặc "Quên" để cập nhật trạng thái SRS

## Hướng dẫn Viết chữ Hán (Stroke Order)
- **Trực quan sinh động:** Tích hợp thư viện HanziWriter để hiển thị thứ tự nét vẽ
- **Hoạt ảnh mượt mà:** Xem từng nét vẽ được thực hiện theo đúng quy tắc
- **Luyện tập chủ động:** Tính năng "Luyện viết" giúp người dùng nắm vững cấu trúc chữ
- **Hỗ trợ đa dạng:** Áp dụng cho toàn bộ danh sách từ vựng trong bài học

## Công nghệ Phát âm (Text-to-Speech)
- **Giọng đọc chuẩn:** Sử dụng Web Speech API với ngôn ngữ `zh-CN`
- **Tương tác tức thì:** Nhấn vào bất kỳ từ hoặc câu hội thoại nào để nghe phát âm
- **Không cần internet:** Hoạt động offline nhờ bộ máy tổng hợp giọng nói có sẵn trên thiết bị

## Lộ trình học tập & Streak
- **Lộ trình 3 giai đoạn:** Từ nền tảng (HSK 1) đến hội thoại thực tế (HSK 2)
- **Hệ thống Streak:** Theo dõi chuỗi ngày học liên tiếp để duy trì động lực
- **Bài học theo chủ đề:** Mỗi bài gồm từ vựng trọng tâm và đoạn hội thoại mẫu

## Kết luận & Hướng phát triển
- **Giải pháp tối ưu:** Kết hợp giữa công nghệ web hiện đại và phương pháp học khoa học
- **Mở rộng tương lai:** Luyện viết trên Canvas, Quiz nhận diện thanh điệu, Thống kê chi tiết
- **Bắt đầu ngay:** Truy cập URL GitHub Pages để trải nghiệm!
