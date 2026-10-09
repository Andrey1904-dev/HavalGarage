import { Link } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'
import { CarIcon } from '../components/icons'
import { useSeo } from '../utils/seo'

/** Страница «не найдено»: не индексируется, предлагает рабочие разделы. */
export default function NotFoundPage() {
  useSeo({
    title: 'Страница не найдена | HAVAL Гараж',
    description: 'Запрошенная страница не найдена. Перейдите в каталог моделей HAVAL или к кредитному калькулятору.',
    path: '/404',
    noindex: true,
  })

  return (
    <div className="animate-page-enter">
      <EmptyState
        icon={<CarIcon className="h-6 w-6" />}
        title="Страница не найдена"
        text="Возможно, ссылка устарела или адрес введён с ошибкой. Начните с каталога моделей или подбора по бюджету."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/catalog">
              <Button type="button">Каталог моделей</Button>
            </Link>
            <Link to="/budget">
              <Button type="button" variant="secondary">
                Подбор по бюджету
              </Button>
            </Link>
            <Link to="/">
              <Button type="button" variant="ghost">
                На главную
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}
