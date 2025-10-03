export async function POST(request) {
  try {
    const body = await request.json();

    // اینجا می‌توانید داده‌ها را در دیتابیس ذخیره کنید
    console.log("توقف ضبط در:", body.endTime, "تعداد داده‌ها:", body.dataCount);

    return Response.json({
      success: true,
      message: "ضبط داده‌های سنسور متوقف شد",
      endTime: body.endTime,
      dataCount: body.dataCount,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "خطا در توقف ضبط",
      },
      { status: 500 },
    );
  }
}
