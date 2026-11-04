/** Поля опубликованного месяца, используемые гостевыми страницами. */
export interface GuestDepositMonth {
  id: number
  name: string
  description: string | null
  month_number: number | null
  days_count: number | null
  image_url: string | null
  video_url: string | null
  likes_count: number
}

export const mockDepositMonths: GuestDepositMonth[] = [
  {
    "id": 1,
    "name": "Январь",
    "description": "В январе теплее, когда деньги не просто лежат, а понемногу растут на вкладе.",
    "month_number": 1,
    "days_count": 31,
    "image_url": "/media/january.jpg",
    "video_url": "/media/january.mp4",
    "likes_count": 4
  },
  {
    "id": 2,
    "name": "Февраль",
    "description": "Февраль короткий, но даже за 28 дней вклад успевает принести начисленные проценты.",
    "month_number": 2,
    "days_count": 28,
    "image_url": "/media/february.jpg",
    "video_url": "/media/february.mp4",
    "likes_count": 3
  },
  {
    "id": 3,
    "name": "Март",
    "description": "Весной растёт всё — пусть вместе с первыми листьями растут и накопления.",
    "month_number": 3,
    "days_count": 31,
    "image_url": "/media/march.jpg",
    "video_url": "/media/march.mp4",
    "likes_count": 5
  },
  {
    "id": 4,
    "name": "Апрель",
    "description": "Пока за окном идут апрельские дожди, проценты по вкладу продолжают начисляться.",
    "month_number": 4,
    "days_count": 30,
    "image_url": "/media/april.jpg",
    "video_url": "/media/april.mp4",
    "likes_count": 2
  },
  {
    "id": 5,
    "name": "Май",
    "description": "Май — время цветения, а накопления тоже могут постепенно расти.",
    "month_number": 5,
    "days_count": 31,
    "image_url": "/media/may.jpg",
    "video_url": "/media/may.mp4",
    "likes_count": 4
  },
  {
    "id": 6,
    "name": "Июнь",
    "description": "Лето только начинается, а деньги уже могут работать, пока вы отдыхаете.",
    "month_number": 6,
    "days_count": 30,
    "image_url": "/media/june.jpg",
    "video_url": "/media/june.mp4",
    "likes_count": 3
  },
  {
    "id": 7,
    "name": "Июль",
    "description": "Пока июль радует солнцем, вклад продолжает приносить начисленные проценты.",
    "month_number": 7,
    "days_count": 31,
    "image_url": "/media/july.jpg",
    "video_url": "/media/july.mp4",
    "likes_count": 3
  },
  {
    "id": 8,
    "name": "Август",
    "description": "Август — хороший момент посмотреть, сколько успели подрасти накопления за лето.",
    "month_number": 8,
    "days_count": 31,
    "image_url": "/media/august.jpg",
    "video_url": "/media/august.mp4",
    "likes_count": 2
  }
]