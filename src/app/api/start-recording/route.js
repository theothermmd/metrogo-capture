export async function POST(request) {
  try {
    const body = await request.json();

    // اینجا می‌توانید داده‌ها را در دیتابیس ذخیره کنید
    console.log("شروع ضبط در:", body.startTime);

    return Response.json({
      success: true,
      message: "ضبط داده‌های سنسور شروع شد",
      startTime: body.startTime,
      sessionId: Date.now().toString(),
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "خطا در شروع ضبط",
      },
      { status: 500 },
    );
  }
}
